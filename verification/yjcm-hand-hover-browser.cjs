// 真实 Card、原生 enter/leave/windowmousedown、生产布局与 transform；真实鼠标，保留过渡。
const fs = require('node:fs');
const path = require('node:path');
const {bootstrap, server, chromium, assert, script, read} = require('../../雷的ol/verification/card-beautify-browser.cjs');
const base = '/extension/十周年UI/';
const results = [];
const method = (filename, start, end) => read(filename).slice(read(filename).indexOf(start), read(filename).indexOf(end));
const spread = method('noname/ui/index.js', '  getSpreadOffset(', '  refresh(');
(async () => {
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	const browser = await chromium.launch({channel:'msedge', headless:true});
	try {
		for (const {style,plainRect} of [{style:'othersOff',plainRect:true}, ...['othersOff', 'onlineUI', 'on', 'off', 'babysha', 'codename'].map(style=>({style,plainRect:false}))]) {
			const page = await browser.newPage({viewport:{width:1368,height:768}});
			const errors = [];
			page.on('pageerror', error => errors.push(error.message));
			const origin = `http://127.0.0.1:${server.address().port}`;
			await bootstrap(page, origin, true);
			await page.evaluate(({style}) => {
				for (const link of document.querySelectorAll('link[href*="/extension/"]')) link.remove();
				document.body.dataset.style = style;
				lib.config.extension_十周年UI_newDecadeStyle = style;
			}, {style});
			const files = await page.evaluate(async ({base,style}) => {
				const {getStyleFile} = await import(base+'src/styles/style-route.js');
				return ['extension','decadeLayout','card','layout'].map(name => base+'src/styles/'+getStyleFile(name,style));
			}, {base,style});
			for (const url of files) await page.addStyleTag({url:origin+url});
			await page.addStyleTag({content:'html,body{margin:0}#arena{position:absolute;inset:0}#samples,#preview{display:none}#hover-me{position:absolute;left:40px;top:440px;width:740px;height:200px}.hand-cards>.handcards>.card{left:0;top:0;width:108px;height:150px;margin:0;animation:none}.card{transition-property:transform,opacity,left,top;transition-duration:.266666667s}.card>.background{display:none}'});
			// bootstrap 原本为静态卡面检查关闭 transition，此处恢复真实运动。
			await page.evaluate(() => {for (const s of document.querySelectorAll('style')) if(s.textContent.includes('.card{transition:none!important}')) s.textContent=s.textContent.replace('.card{transition:none!important}','');});
			await page.addScriptTag({content:script('noname/ui/click/index.js','window.NativeClick=Click;')});
			await page.addScriptTag({content:'ui.getSpreadOffset=({'+spread+'}).getSpreadOffset;'});
			await page.addScriptTag({content:script('extension/十周年UI/src/core/layout.js','window.hoverLayout=e();')});
			await page.addScriptTag({content:script('extension/十周年UI/src/ui/handcard-motion-xinsha.js','Object.assign(window,{updateXinshaHandMotion,clearXinshaHandMotion,restoreXinshaHandMotionCopy,finishXinshaHandMotion});')});
			await page.addScriptTag({content:script('extension/十周年UI/src/utils/hand-card-position.js','window.preserveConfirmedHandCard=preserveConfirmedHandCard;')});
			await page.addScriptTag({content:script('extension/十周年UI/src/overrides/card/overrides.js','window.hoverTransform=p;')});
			await page.addScriptTag({content:script('extension/十周年UI/src/overrides/ui/click.js','window.productionCardClick=t;')});
			await page.evaluate(({style,plainRect}) => {
				Object.assign(lib.config,{spread_card:true,fold_card:false,touchscreen:false,enable_drag:false});
				lib.setIntro=()=>{};
				ui.selected={cards:[]}; ui._handcardHover=null;
				ui.click.cardmouseenter=NativeClick.prototype.cardmouseenter;
				ui.click.cardmouseleave=NativeClick.prototype.cardmouseleave;
				ui.click.card= function(event){
					const before=this.classList.contains('selected');
					productionCardClick.call(this,event);
					if(before!==this.classList.contains('selected')) window.clicked.push(this.dataset.index);
				};
				window.clicked=[];
				game.me={}; _status.event={player:game.me,isMine:()=>true,custom:{replace:{},add:{}},selectCard:[0,1]};
				get.info=()=>undefined;get.select=value=>value;
				game.check=()=>{hoverLayout.updateHand();return false;};
				Array.prototype.remove=function(value){const i=this.indexOf(value);if(i>=0)this.splice(i,1);};
				_status.lastdragchange=[];ui.touchlines=[];ui.canvas=document.createElement('canvas');
				get.utc=()=>Date.now();
				get.itemtype=node=>node?.classList?.contains('card')?'card':'';
				ui.window=ui.arena;
				ui.me=document.createElement('div'); ui.me.id='hover-me';
				ui.handcards1Container=document.createElement('div');ui.handcards1Container.className='hand-cards';
				ui.handcards1=document.createElement('div');ui.handcards1.className='handcards';
				game.me.node={handcards1:ui.handcards1};
				ui.me.append(ui.handcards1Container);ui.handcards1Container.append(ui.handcards1);ui.arena.append(ui.me);
				window.decadeUI={config:{newDecadeStyle:style},layout:hoverLayout,boundsCaches:{hand:{width:740,cardWidth:108,cardHeight:150,cardScale:1,x:40,check(){}}}};
				window.LAYOUT={CARD_SELECT_OFFSET_DESKTOP:12,CARD_SELECT_OFFSET_MOBILE:10};
				ui.updatehl=()=>requestAnimationFrame(()=>hoverLayout.updateHand());
				window.addEventListener('mousedown',event=>NativeClick.prototype.windowmousedown.call(ui.click,event));
				window.addEventListener('mouseup',event=>NativeClick.prototype.windowmouseup.call(ui.click,event));
				window.addEventListener('click',()=>{_status.clicked=false;});
				window.buildHand=(count,scale=1,width=740)=>{
					ui.handcards1.innerHTML='';ui.selected.cards=[];ui._handcardHover=null;
					Object.assign(decadeUI.boundsCaches.hand,{width,cardScale:scale});ui.me.style.width=width+'px';
					for(let i=0;i<count;i++){
						const card=createDecadeCard(ui.handcards1,undefined,true);card.dataset.index=i;card.init(['spade',i%13+1,'sha']);card.updateTransform=hoverTransform;card.classList.add('selectable');
						if(plainRect) card.getBoundingClientRect=function(){const r=Element.prototype.getBoundingClientRect.call(this);return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
					}
					hoverLayout.updateHand();
				};
				window.readHand=()=>[...ui.handcards1.children].map(card=>{const r=card.getBoundingClientRect();return {x:card.tx,y:card.ty,transform:card.style.transform,rect:{x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}};});
				buildHand(12);
			}, {style,plainRect});
			await page.waitForTimeout(600);
			const before=await page.evaluate(()=>readHand());
			const last=before.at(-1).rect;
			await page.mouse.move(last.right-2,last.bottom-3);
			const frames=await page.evaluate(async()=>{
				const samples=[];
				const until=performance.now()+1300;
				while(performance.now()<until){samples.push({hover:ui._handcardHover?.dataset.index??null,cards:readHand()});await new Promise(requestAnimationFrame);}
				return samples;
			});
			if(style==='othersOff'){
				assert.ok(frames.every(frame=>frame.hover==='11'),'stationary last card retains hover');
				const stable=frames.slice(-30);
				assert.ok(stable.every(frame=>Math.abs(frame.cards[11].rect.x-stable[0].cards[11].rect.x)<.05),'no repeated left/right motion');
				assert.ok(stable[0].cards[11].transform.includes('translateY(-18px)'),'21/126 face-width lift');
				assert.equal(await page.evaluate(()=>ui.selected.cards.length),0,'preview does not select');
				assert.ok(Math.abs(stable[0].cards[11].rect.x-before[11].rect.x)>1,'real transition reflows last card');
				await page.mouse.click(last.right-2,last.bottom-3);
				assert.deepEqual(await page.evaluate(()=>clicked),['11'],'click original exposed strip selects the previewed card');
				await page.mouse.move(1250,120);await page.waitForTimeout(400);
				await page.evaluate(()=>{ui.handcards1.querySelector('.selected').classList.remove('selected');ui.selected.cards=[];hoverLayout.updateHand();});
				await page.waitForTimeout(400);
				for(const index of [0,5,11]){
					const card=await page.evaluate(index=>readHand()[index].rect,index);
					await page.mouse.move(card.x+3,card.y+60);await page.waitForTimeout(400);
					assert.equal(await page.evaluate(()=>ui._handcardHover?.dataset.index),String(index),'can move to another card');
					await page.mouse.move(1250,120);await page.waitForTimeout(400);
					assert.equal(await page.evaluate(()=>ui._handcardHover),null,'leave clears preview');
				}
				await page.evaluate(()=>{lib.config.enable_drag=true;ui.arena.classList.add('selecting');_status.clicked=false;});
				const dragLast=(await page.evaluate(()=>readHand())).at(-1).rect;
				await page.mouse.move(dragLast.right-2,dragLast.bottom-3);await page.waitForTimeout(400);
				await page.mouse.down();
				assert.equal(await page.evaluate(()=>_status.mousedragorigin?.dataset.index),'11','native drag starts from previewed last card');
				await page.mouse.up();await page.mouse.move(1250,120);await page.waitForTimeout(400);
				await page.evaluate(()=>{lib.config.enable_drag=false;ui.arena.classList.remove('selecting');_status.clicked=false;});
				const layouts=await page.evaluate(()=>{
					const rows=[];
					for(const count of [4,5,6,12,40])for(const scale of [.7,1,1.35])for(const width of [480,740])for(const index of [0,Math.floor(count/2),count-1]){
						buildHand(count,scale,width);const before=readHand();
						ui._handcardHover=ui.handcards1.children[index];hoverLayout.updateHand();const hover=readHand();
						ui._handcardHover=null;ui.handcards1.children[index].classList.add('selected');ui.selected.cards=[ui.handcards1.children[index]];hoverLayout.updateHand();
						rows.push({count,scale,width,index,before,hover,selected:readHand()});
					}
					return rows;
				});
				for(const row of layouts){
					assert.deepEqual(row.hover.map(c=>[c.x,c.transform]),row.selected.map(c=>[c.x,c.transform]),'hover/selected same official layout');
					const face=108*row.scale, available=row.width-face/2, wide=face*80/126;
					const slots=[];
					if(row.count>=5&&available/row.count<wide){
						for(let i=1;slots.length<5;i++)for(const candidate of [row.index-i+1,row.index+i])if(candidate>=0&&candidate<row.count&&slots.length<5)slots.push(candidate);
					}
					const narrow=slots.length?Math.min(face,(available-wide*slots.length)/(row.count-slots.length)):Math.min(face,available/row.count);
					let x=(face-108)/2+face/2;
					row.hover.forEach((card,index)=>{assert.equal(card.x,Math.round(x),'source-reconstructed step slots');x+=slots.includes(index)?wide:narrow;});
				}
				await page.mouse.move(1250,120);
				await page.evaluate(()=>{buildHand(80);lib.config.fold_card=true;hoverLayout.updateHand();});
				assert.equal(await page.evaluate(()=>ui.handcards1Container.classList.contains('scrollh')),true,'fold scrolling retained');
				await page.evaluate(()=>{lib.config.fold_card=false;lib.config.spread_card=false;buildHand(12);});await page.waitForTimeout(400);
				const disabled=await page.evaluate(()=>readHand());const r=disabled.at(-1).rect;
				await page.mouse.move(r.right-2,r.bottom-3);await page.waitForTimeout(400);
				assert.deepEqual(await page.evaluate(()=>readHand().map(c=>c.transform)),disabled.map(c=>c.transform),'spread_card off');
				results.push({style,plainRect,stationarySamples:frames.length,stableHover:true,originalStripClick:true,nativeDragOrigin:true,layouts:layouts.length,fold:true,settingOff:true});
			}else{
				const native=await page.evaluate(()=>{const cards=[...ui.handcards1.children];return ui.getSpreadOffset(cards,{cardWidth:108,currentMargin:632/11});});
				assert.equal(native.spreadIndex,11,'native hover handlers retained');
				const margin=(740-108)/11, left=Math.round((108-margin)*.2);
				frames.slice(-20).forEach(frame=>frame.cards.forEach((card,index)=>assert.equal(card.x,Math.round(index*margin-(index<11?left:0)),'unchanged generic spread coordinates')));
				assert.ok(frames.every(frame=>frame.cards.every(card=>!card.transform.includes('translateY'))),'other styles do not receive hover lift');
				results.push({style,nativeHandlers:true,noXinshaLift:true});
			}
			assert.deepEqual(errors,[]);
			await page.close();console.log(style+(plainRect?' (no toJSON)':'')+': PASS');
		}
		fs.writeFileSync(path.join(__dirname,'yjcm-hand-hover-results.json'),JSON.stringify(results,null,2)+'\n');
	}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
