"""核对当前APK与已解码缓存，静态解析装备飞牌的完整调用分支，不执行客户端。"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', required=True)
    parser.add_argument('--game-archive', required=True)
    parser.add_argument('--packed-cache', required=True)
    parser.add_argument('--lua-reader', required=True)
    args = parser.parse_args()
    report_path = ROOT / 'verification/yjcm-equip-animation-source.json'
    report = json.loads(report_path.read_text('utf8'))
    client = report['client']
    assert digest(Path(args.apk).read_bytes()) == client['apk_sha256']
    with zipfile.ZipFile(args.apk) as apk:
        packed = apk.read(client['member'])
        assert packed == Path(args.packed_cache).read_bytes()
        assert digest(packed) == client['packed_sha256']
    assert digest(Path(args.game_archive).read_bytes()) == client['decoded_sha256']
    Chunk = runpy.run_path(args.lua_reader)['Chunk']
    selected = {
        'app.manager.game.GameMoveManager': ['0.0.0'],
        'app.manager.game.GameManager': ['0.262', '0.262.2'],
        'app.controller.game.MoveCardController': ['0.2', '0.8', '0.10', '0.11', '0.13', '0.15', '0.20', '0.20.0'],
        'app.view.game.card.SelfCardsArea': ['0.7'],
        'app.view.game.DisCardAreaUi': ['0.6', '0.13', '0.19'],
        'app.view.game.GameLayer': ['0.22'],
        'app.view.game.seat.SelfSeatView': ['0.11'],
        'app.view.game.GameSeatCcb': ['0.152'],
    }
    modules = []
    with zipfile.ZipFile(args.game_archive) as game:
        for name, ids in selected.items():
            data = game.read(name)
            chunk = Chunk(data)
            chunk.function()
            assert chunk.p == len(data), name
            prototypes = [row for row in chunk.rows if row['id'] in ids]
            assert len(prototypes) == len(ids), name
            modules.append(dict(member=name, sha256=digest(data), prototypes=prototypes))
    report['modules'] = modules
    report['rea_evidence'] = [
        'ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965',
        'ev_8a72e32c34675ee63afb8842348a359d1e11de76b120394a47bae68bd545c346',
    ]
    report['observations'] = [
        'GameMoveManager0.0.0 PC426..492: to ZONE_EQUIP adds actual equip cards; for one real equipment matching spell_id_for_use_card and nonzero getSpellId, calls playMoveCardFlyAni. No horse or consecutive-use index gate in this equipment dispatch.',
        'The same function PC730..942 handles ZONE_STACK through moveCardsToStack; MoveCardController0.13 calls addToStackArea, which adds each card at its supplied source position and starts reorderAllCards. Entry is asynchronous, not a blocking completed 300ms leg.',
        'DisCardAreaUi0.19 PC55..94: 300ms EaseSineOut MoveTo together with linear ScaleTo0.8. GameLayer0.22 PC20..36 places the stack at display(width/2,height/2+20), Cocos bottom-up.',
        'GameManager0.262 PC50..68 hides the actual equipment, invokes moveCardsFromStackToEquipArea, and its callback0.262.2 shows the actual equipment again.',
        'MoveCardController0.20 PC1..12: getStackCardPos reads the current animated card center in world space and removes the stack copy. It does not wait for reorderAllCards to finish. The new flying CardUi is setScale(1) at PC48..50.',
        'MoveCardController0.20 PC70..116: EQ A=0 B=targetSeat C=selfSeat. Equal skips the next JMP, entering the self-only defaultAction leg; other seats jump to PC117 and the slot leg. otherSeatViews receives GameAllSeatView.seats, which also contains the self portrait.',
        'PC84..96 explicitly calls seat:getSeatPos(seat). SelfSeatView0.11 truthy argument delegates to super.getSeatPos(self); GameSeatCcb0.152 returns the scaled portrait center. The nil/false display(cx,cy-175) branch is NOT this call. Previous source annotations and local mapping were wrong.',
        'defaultAction0.11 true branch: Scale0.97 ->1 in100ms, hold233.333ms, ->0.97 in100ms. EaseSineIn MoveTo the portrait in433.333ms. Opacity0.85 ->1 in100ms, hold433.333ms, EaseSineIn FadeOut100ms. Total633.333ms. It does not shrink toward0.2 while flying to the portrait.',
        'After defaultAction,0.20 appends the slot spawn, then removeSelf/callback. Slot durations:366.667ms ordinary,500ms horse,433.333ms armour. Scale targets0.78,0.57,0.35,0.2 with duration fractions2/11,2/11,4/11,3/11; linear MoveTo final slot; FadeIn66.667ms, delay(duration-166.667ms), FadeOut100ms.',
        'isHorse at0.20 PC118..124 only changes the final slot duration. No use-count/index state in this function. A same-frame stack/equip notification can leave no visible outward leg for any equipment; the exact notification intervals in the user recording cannot be recovered from static APK code alone.',
        'MoveCardController0.10 ->0.2 ->SelfCardsArea0.7 reads actual self hand-card positions before removal;0.8 supplies other-seat portrait-centered positions. This confirms separate self/other origins, not a universal stack spawn.',
    ]
    report['coordinate_authority'] = dict(
        static_source='GameLayer0.22 stack center; SelfSeatView0.11 truthy overload -> GameSeatCcb0.152 portrait center; MoveCardController0.20 final equip center.',
        mapping='Convert window/portrait/equip centers through arena rect/client scale; subtract half unscaled local card box. Preserve configured local hand/discard size. Equip strip DOM geometry adapts the native EquipArea target.',
        supersedes='cy-175 is not the official truthy getSeatPos(view) target. It is used ONLY as the requested local self presentation point before the source-confirmed portrait leg. Do not describe that presentation point as a directly observed official equip endpoint.',
    )
    report['local_adaptation'] = (
        'Requested visual adaptation, distinct from static official observations: both views submit the first flight immediately when using equipment, before native moveDelete. Self origin is the actual hand card; other origin is the actual portrait center. Neither view waits for notification or between flight phases. Later notifications never restart a flight. '
        'Self:300ms full-size flight to the lower window center(cx,cy-175), then the source-confirmed433.333ms EaseSineIn move to the actual portrait, then the source-confirmed subtype slot duration and scale targets. '
        'Other:following the user request to further extend the40% outward route, fly60% toward the stack center over200ms (slightly slowed from160ms); the slot start reads the completed entry animation duration to avoid stale handoff offsets while retaining full card size, then immediately enter the actual equip slot. This distance/duration is a requested local adapter, not an official constant. '
        'For smooth handoffs, remove the official 200ms post-portrait hold/fade, keep opacity 1 across both joins, and preserve scale at every boundary. Opacity decreases continuously during the slot flight, from 1 to 0.9 before the final 100ms, then to 0 at the slot center. This retains the requested fade during motion and gives the strongest fade the same 100ms window as the official client. '
        'All phases use Web Animations. The first animation is submitted paused at currentTime0. If the actual card skin is visibility:hidden/display:none (e.g. Lei Yijiang cold-image decoding), watch card class/style/children without polling and start only once visible. Then one requestAnimationFrame starts playback with its fresh timestamp; this is a one-shot startup, not a per-frame controller. Invisible-card time is excluded, preserving the full200ms outward leg and adjacent slot timing. A3s readiness timeout restores actual equipment. This also avoids an unbounded pending-play wait. Backdating the first animation to a stale document.timeline.currentTime was reproduced to skip the visible hand flight under a420ms main-thread stall. Subsequent startTime equals previous startTime+duration, not a new wall-clock start. Only host/layout changes update keyframes; no per-frame layout polling or style writes. '
        'Actual equipment is hidden until the flight finishes. For non-self locally executed useCard only (excluding remote clients/replay), replace the native fixed pre-effect display delay with the existing waitingForTransition mechanism: register a private token after synchronous throw setup and release only that token when flight completes/cancels. This lets native equip execute immediately afterward without blank-slot delay, preserving equip conditions/order/identity/video/broadcast. No early equip call or synthetic equipment card is introduced. No horse skip or consecutive-use heuristic.'
    )
    report.pop('remote_first_stage_recheck', None)
    report['validation'] = dict(
        commands=[
            'python -B verification/verify-yjcm-equip-animation-source.py --apk <APK> --game-archive <decoded-game.zip> --packed-cache <game.packed> --lua-reader <read-official-lua.py>',
            'node --check src/overrides/player/card-movement-xinsha.js',
            'node --check verification/yjcm-equip-animation-browser.cjs',
            'node --check verification/yjcm-equip-animation-live.cjs',
            'node verification/yjcm-equip-animation-browser.cjs',
            'node verification/yjcm-equip-animation-live.cjs',
        ],
        browser='Not executed by this static verifier; run yjcm-equip-animation-browser.cjs separately for current results.',
        live='Not executed by this static verifier; run yjcm-equip-animation-live.cjs separately for actual noname useCard/equip results. This does not verify the current Electron game.',
        results=['verification/yjcm-equip-animation-results.json', 'verification/yjcm-equip-animation-live-results.json'],
        official_client_runtime=False, current_electron_game=False, mobile_device=False, real_network_multiplayer=False,
    )
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
    print('YJCM_EQUIP_SOURCE_OK:', len(modules), 'modules;', sum(len(m['prototypes']) for m in modules), 'prototypes; APK/packed/decoded hashes verified')


if __name__ == '__main__':
    main()
