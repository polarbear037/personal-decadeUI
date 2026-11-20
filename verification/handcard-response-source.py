import hashlib,json,zipfile,io
from pathlib import Path
root=Path.cwd();sha=lambda x:hashlib.sha256(x).hexdigest();apk=Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
assert sha(apk.read_bytes())=='12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
with zipfile.ZipFile(apk) as z:packed=z.read('assets/res/lib/game.zip')
assert sha(packed)=='df9af4ec01e45b7a2bca47b4fa22c1537c8c8365199b8ba2f764224d5e696d04'
decoded=Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114/game-from-apk-decoded.zip').read_bytes();assert sha(decoded)=='23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
ref=root.parent/'抚琴益州';manifest=json.loads((ref/'reverse/source-manifest.json').read_text('utf8'));modules=[]
with zipfile.ZipFile(io.BytesIO(decoded)) as z:
 for name in ['app.view.game.card.SelfCardsArea','app.view.game.card.CardUiNew']:
  raw=z.read(name);rec=next((r for r in manifest['records'] if r['module']==name),None)
  if rec:
   source=(ref/rec['source']).read_bytes();assert sha(raw)==rec['bytecode_sha256'];assert sha(source)==rec['source_sha256'];modules.append(dict(member=name,sha256=sha(raw),source_sha256=sha(source),source=rec['source']))
  else:
   import runpy
   Chunk=runpy.run_path(str(root.parent/'犟0/tools/read-official-lua.py'))['Chunk'];chunk=Chunk(raw);chunk.function();assert chunk.p==len(raw);assert chunk.rows==json.loads((root/'.codex-tmp/yjcm-buttons'/f'{name}.json').read_text('utf-8-sig'));modules.append(dict(member=name,sha256=sha(raw),parsed_cache_verified=True))
report=dict(apk=str(apk),apk_sha256=sha(apk.read_bytes()),member='assets/res/lib/game.zip',packed_sha256=sha(packed),decoded_sha256=sha(decoded),rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965','ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'],modules=modules,observations=['SelfCardsArea.moveCardTime=8/30s; CARD_SELECTED_POP_HEIGHT=21; reorderAllCards_new uses EaseSineOut(moveTo) for repositioning.','CardUiNew.updateCardActive calls setCoverEnable(false) for cardData:isActive(), otherwise true. setCoverEnable(true) creates/reuses #card_cover.png and shows it; false hides it.','CardUiNew.playCardAni resolves the current card spell/property to an animation and uses ui.spineToNode then aligns the effect to card center and plays play.'],local_adaptation=['Keep engine cardSavable/cardRespondable; coerce availability to a boolean before DOMTokenList.toggle. undefined in an optional WebIDL force parameter toggles instead of forcing false.','Begin the local selection motion from a paused first frame after game.check, using a fresh performance.now() clock. Mouse hover keeps its native hit-geometry restoration.','Queue the card effect after a paint and into a separate task; preserve the existing companion effect wrapper, Spine pool, asset map and actual card rules.'],limits=['Shipped bytecode and hash-matched decompiler reconstruction, not original authoring source.','No official Android client runtime comparison.'])
(root/'verification/handcard-response-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8');print('HANDCARD_RESPONSE_SOURCE_OK: current APK, bytecode and matching reconstruction verified')
