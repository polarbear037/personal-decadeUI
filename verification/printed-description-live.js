// 当前窗口已缓存旧布局时的热接入；只更新印牌标题/说明DOM及高度，不改原事件。
(async () => {
	try {
		if (window.__printedSkillDescriptionFix) return { installed: true, existing: true };
		const { getPrintedSkillDescription, getPrintedSkillPromptHeight } = await import('/extension/十周年UI/src/ui/printed-skill-prompt.js');
		const states = new WeakMap(), original = ui.update;
		let updating = false;
		const patch = () => {
			if (updating) return false;
			const dialog = ui.dialog, event = _status.event;
			if (!dialog || event?.name !== 'chooseButton' || !event.isMine?.() || dialog.classList.contains('removing') || dialog.hidden) return false;
			const saved = states.get(dialog);
			if (dialog.dataset.lyjTable !== 'printed' && saved) {
				if (dialog.style.getPropertyValue('height') === saved.applied) {
					if (saved.value) dialog.style.setProperty('height', saved.value, saved.priority);
					else dialog.style.removeProperty('height');
				}
				states.delete(dialog);
			}
			const description = getPrintedSkillDescription(dialog, event), caption = dialog.content?.querySelector(':scope>.caption');
			if (!description || !caption) return false;
			let changed = false;
			updating = true;
			try {
				if (dialog.querySelector(':scope>.dialog-ol-footer')?.textContent.trim() !== description) {
					const copy = caption.cloneNode(true); copy.querySelectorAll('.dialog-ol-collapse').forEach(node => node.remove());
					const title = copy.textContent.trim().split(/[：:]/)[0], arrow = caption.querySelector('.dialog-ol-collapse');
					caption.replaceChildren(document.createTextNode(title + '：' + description)); if (arrow) caption.append(arrow);
					changed = true;
				}
				const count = dialog.buttons?.length;
				if (!saved || saved.description !== description || saved.count !== count) {
					const state = saved || { value: dialog.style.getPropertyValue('height'), priority: dialog.style.getPropertyPriority('height') };
					dialog.style.setProperty('height', getPrintedSkillPromptHeight(dialog, description) + 'px', 'important');
					Object.assign(state, { description, count, applied: dialog.style.getPropertyValue('height') }); states.set(dialog, state); changed = true;
				}
				return changed;
			} finally { updating = false; }
		};
		ui.update = function (...args) { patch(); return original.apply(this, args); };
		const check = () => { if (patch()) original.call(ui); };
		lib.hooks.checkEnd.add(check); window.__printedSkillDescriptionFix = { patch, check };
		const event = _status.event, hand = game.me.countCards('h'); ui.update();
		return { installed: true, currentPrinted: ui.dialog?.dataset.lyjTable === 'printed', eventUnchanged: event === _status.event, handUnchanged: hand === game.me.countCards('h') };
	} catch (error) { return { error: String(error), stack: error.stack }; }
})();
