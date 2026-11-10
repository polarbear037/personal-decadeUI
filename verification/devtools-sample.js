// 在游戏控制台按需导入；只做一次有限采样，不修改游戏配置或界面。
function startElectronProcessSample() {
	try {
		if (typeof globalThis.require !== "function") return { finish: () => ({ available: false, reason: "Electron require is unavailable" }) };
		const electron = globalThis.require("electron");
		const remote = electron.remote || globalThis.require("@electron/remote");
		const contents = remote.getCurrentWebContents();
		const gamePid = contents.getOSProcessId();
		const devtoolsPid = contents.devToolsWebContents?.getOSProcessId() || null;
		const snapshot = () => remote.app.getAppMetrics().map(metric => ({
			pid: metric.pid,
			creationTime: metric.creationTime,
			type: metric.type,
			cpuSeconds: metric.cpu.cumulativeCPUUsage,
			workingSetMB: Math.round((metric.memory.workingSetSize || 0) / 1024),
		}));
		const before = new Map(snapshot().map(metric => [metric.pid, metric]));
		const started = performance.now();
		return {
			finish() {
				try {
					const finalDevtoolsPid = contents.devToolsWebContents?.getOSProcessId() || devtoolsPid;
					const after = snapshot();
					const elapsedMs = performance.now() - started;
					return {
						available: true,
						gamePid,
						devtoolsPid: finalDevtoolsPid,
						sharedRendererProcess: !!finalDevtoolsPid && gamePid === finalDevtoolsPid,
						// CPU 时间 / 墙钟时间，单个逻辑核心满载为 100%，多线程进程可超过 100%。
						cpuPercentBasis: "CPU seconds / elapsed seconds; one logical core = 100%",
						processes: after.map(metric => {
							const previous = before.get(metric.pid);
							const cpuSeconds = previous && previous.creationTime === metric.creationTime && Number.isFinite(metric.cpuSeconds) && Number.isFinite(previous.cpuSeconds)
								? Math.max(0, metric.cpuSeconds - previous.cpuSeconds) : null;
							const role = metric.pid === gamePid && metric.pid === finalDevtoolsPid ? "game+devtools" : metric.pid === gamePid ? "game" : metric.pid === finalDevtoolsPid ? "devtools" : metric.type;
							return { pid: metric.pid, role, cpuTimePercent: cpuSeconds === null ? null : Math.round(cpuSeconds * 100000 / elapsedMs), workingSetMB: metric.workingSetMB };
						}),
					};
				} catch (error) {
					return { available: false, reason: String(error) };
				}
			},
		};
	} catch (error) {
		return { finish: () => ({ available: false, reason: String(error) }) };
	}
}

export async function sampleDevtoolsIdle(durationMs = 5000) {
	const duration = Math.min(15000, Math.max(1000, Number(durationMs) || 5000));
	const electronSample = startElectronProcessSample();
	const mutations = new Map();
	const frameGaps = [];
	const longTasks = [];
	const started = performance.now();
	let lastFrame = started;
	let frameId = 0;
	let mutationCount = 0;
	let mutationLimitReached = false;
	const describe = node => {
		const element = node.nodeType === 1 ? node : node.parentElement;
		if (!element) return node.nodeName;
		return element.tagName.toLowerCase() + (element.id ? `#${element.id}` : "") + Array.from(element.classList).slice(0, 4).map(name => `.${name}`).join("");
	};
	const observer = new MutationObserver(records => {
		for (const record of records) {
			const key = `${describe(record.target)} [${record.attributeName || record.type}]`;
			mutations.set(key, (mutations.get(key) || 0) + 1);
			if (++mutationCount >= 20000) {
				mutationLimitReached = true;
				observer.disconnect();
				break;
			}
		}
	});
	let taskObserver;
	if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask")) {
		taskObserver = new PerformanceObserver(list => {
			for (const task of list.getEntries()) {
				if (longTasks.length < 100) longTasks.push(Math.round(task.duration));
			}
		});
		taskObserver.observe({ type: "longtask" });
	}
	const frame = now => {
		frameGaps.push(now - lastFrame);
		lastFrame = now;
		frameId = requestAnimationFrame(frame);
	};
	observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
	frameId = requestAnimationFrame(frame);
	try {
		await new Promise(resolve => setTimeout(resolve, duration));
	} finally {
		observer.disconnect();
		taskObserver?.disconnect();
		cancelAnimationFrame(frameId);
	}
	const sortedGaps = frameGaps.slice(1).sort((a, b) => a - b);
	const gap = percentile => Math.round(sortedGaps[Math.min(sortedGaps.length - 1, Math.floor(sortedGaps.length * percentile))] || 0);
	const result = {
		version: 2,
		elapsedMs: Math.round(performance.now() - started),
		documentHidden: document.hidden,
		nodes: document.querySelectorAll("*").length,
		decadeInitialized: !!globalThis.decadeUI,
		lobbyInitialized: !!globalThis.__tlLobbyInstance,
		frameCount: frameGaps.length,
		frameGapMs: { median: gap(0.5), p95: gap(0.95), max: gap(1) },
		longTaskSupported: !!taskObserver,
		longTasksMs: longTasks,
		mutationCount,
		mutationLimitReached,
		topMutations: Array.from(mutations, ([target, count]) => ({ target, count })).sort((a, b) => b.count - a.count).slice(0, 15),
		electron: electronSample.finish(),
	};
	console.log("[DevTools采样] " + JSON.stringify(result));
	return result;
}
