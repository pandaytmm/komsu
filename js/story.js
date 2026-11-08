/* Hikâye: bölümler, kanıtlar, sigortalar, kaset ve iki final */
window.STORY = (function () {
  const S = {
    started: false, chapter: 0, elapsed: 0, caughtCount: 0,
    evidence: [], fuses: [], hasKey: false, power: false,
    tapePlayed: false, pendingChoice: false, pendingNoteAfter: null,
    lastNoteOpen: false, caughtTimer: 0, ending: false,
    checkpoint: { x: -4.5, y: 0, z: -13.6, yaw: Math.PI }
  };

  const EVIDENCE_NAMES = { photo: 'Fotoğraf', diary: 'Günlük', letter: 'Mektup' };

  const CAUGHT_LINES = [
    '"Bir daha gelme. Burada bir şey yok."',
    '"Elif gitti. Sen de git."',
    '"Neden hâlâ bu evdesin?"',
    '"Onu geri getiremem. Seni de kaybetmek istemiyorum."'
  ];

  function init() {
    AI.onCatch = caught;
    PLAYER.noiseCallback = AI.hear;
    UI.setBottles(3);
    UI.setEvidence([]);
    UI.setFuses([], false);
    UI.setStamina(100);
  }

  function startGame(diff) {
    S.started = true;
    S.chapter = 0;
    S.elapsed = 0;
    S.caughtCount = 0;
    S.evidence = [];
    S.fuses = [];
    S.hasKey = false;
    S.power = false;
    S.tapePlayed = false;
    S.pendingChoice = false;
    S.ending = false;
    S.checkpoint = { x: -4.5, y: 0, z: -13.6, yaw: Math.PI };

    AI.setDifficulty(diff);
    AI.reset();
    PLAYER.reset();
    PLAYER.setPosition(-4.5, 0, -13.6, Math.PI);

    UI.start(false);
    UI.showHUD(true);
    UI.setEvidence([]);
    UI.setFuses([], false);
    UI.setBottles(3);
    UI.setStamina(100);
    UI.setSuspicion(0, false);
    UI.objective('Arka bahçedeki açık kapıdan eve gir.');
    UI.chapter('BÖLÜM I', 'BAHÇE', 'Yağmur, dört yıldır aynı sokakta yağıyor.');

    S.chapter = 1;
  }

  function setObjective() {
    if (S.chapter === 1) {
      UI.objective('Arka bahçedeki açık kapıdan eve gir.');
    } else if (S.chapter === 2) {
      UI.objective('Üç kanıtı bul — fotoğraf, günlük, mektup.');
      UI.setItems(['photo', 'diary', 'letter'].map(id => ({
        text: EVIDENCE_NAMES[id], done: S.evidence.includes(id)
      })));
    } else if (S.chapter === 3) {
      if (S.fuses.length < 3) UI.objective('Üç eski sigortayı bul: kulübe, banyo, Kemal\'in odası.');
      else UI.objective('Sigortaları kilerdeki sigorta kutusuna tak.');
      UI.setItems([]);
    } else if (S.chapter === 4) {
      UI.objective('Bodruma in. Kaseti bul ve dinle.');
      UI.setItems([]);
    } else if (S.chapter === 5) {
      UI.objective('Kaseti ne yapacağına karar ver.');
      UI.setItems([]);
    }
  }

  function beginChapter2() {
    if (S.chapter >= 2) return;
    S.chapter = 2;
    S.checkpoint = { x: 0.4, y: 0, z: -7.6, yaw: Math.PI };
    UI.chapter('BÖLÜM II', 'EV', 'Kemal Bey içeride. Nefesini tut.');
    setObjective();
    UI.setEvidence(S.evidence);
    UI.toast('Kanıtları bul. Kemal duyuyor.');
    UI.subtitle('', 'Arka kapı arkanda gıcırdayarak kapandı.', 4);
    SFX.doorOpen();
  }

  function beginChapter3() {
    if (S.chapter >= 3) return;
    S.chapter = 3;
    S.checkpoint = { x: 0.4, y: 0, z: -7.6, yaw: Math.PI };
    UI.chapter('BÖLÜM III', 'SİGORTA', 'Evin kalbi yeniden atmalı.');
    UI.setFuses(S.fuses, true);
    setObjective();
    UI.subtitle('KEMAL', 'Elektrik yok... yine mi attı?', 3.4);
    UI.toast('Kilerdeki sigorta kutusuna üç sigorta gerek.');
  }

  function addEvidence(id) {
    if (S.evidence.includes(id)) return;
    S.evidence.push(id);
    UI.setEvidence(S.evidence);
    SFX.pickup();
    if (S.chapter === 2) setObjective();
    if (S.evidence.length === 3) {
      UI.toast('Üç kanıt da tamam. Şimdi elektrik.');
      setTimeout(() => { if (S.started && !S.ending) beginChapter3(); }, 1200);
    }
  }

  function addFuse(id) {
    if (S.fuses.includes(id)) return;
    S.fuses.push(id);
    UI.setFuses(S.fuses, S.chapter >= 3);
    SFX.fuseGet();
    UI.toast(`Sigorta bulundu (${S.fuses.length}/3).`);
    if (S.chapter >= 3) setObjective();
    if (S.fuses.length === 3 && S.chapter >= 3) {
      UI.toast('Üç sigorta da hazır. Kilerdeki kutuya tak.');
    }
  }

  function openNote(title, body, after) {
    UI.note(title, body);
    S.pendingNoteAfter = after || null;
    S.lastNoteOpen = true;
  }

  function installFuses() {
    if (S.power) { UI.toast('Elektrik çoktan geldi.'); return; }
    if (S.evidence.length < 3) {
      SFX.locked();
      UI.subtitle('SEN', 'Önce ne olduğunu anlamam lazım. Kanıtlar eksik.', 3);
      return;
    }
    if (S.fuses.length < 3) {
      SFX.locked();
      UI.toast(`Kutuda ${3 - S.fuses.length} boş yuva var.`);
      UI.subtitle('SEN', `Üç sigortadan ${S.fuses.length} tanesi bende.`, 2.6);
      return;
    }
    S.power = true;
    WORLD.setPower(true);
    WORLD.unlockBasement();
    S.chapter = 4;
    S.checkpoint = { x: 8.0, y: 0, z: -4.4, yaw: Math.PI };
    UI.chapter('BÖLÜM IV', 'BODRUM', 'Evin altında bir ses var.');
    UI.setFuses(S.fuses, true);
    setObjective();
    UI.flash(0.4);
    S.pendingNoteAfter = null;
    setTimeout(() => {
      if (!S.started || S.ending) return;
      SFX.radioStatic(2.6);
      UI.subtitle('KEMAL', 'Hayır... hayır, neden şimdi?', 3.4);
      SFX.stinger();
    }, 1600);
  }

  function openTape() {
    if (S.tapePlayed) return;
    S.tapePlayed = true;
    SFX.radioStatic(1.4);
    SFX.tape();
    S.chapter = 5;
    setObjective();
    openNote('KASET 4 — ELİF', `
      <p><em>“Baba, dinle. Yine o ses. Bodrumdan geliyor.”</em></p>
      <p>“Öğretmenin bugün parkta seni bekleyeceğini söyledi. Gelmedin. Ben de eve yürüdüm.”</p>
      <p>“Kasetleri sakladığını biliyorum. Her gece kendi sesimi radyoda duyuyorum. Kapat artık.”</p>
      <p>“Ben iyiyim. Ama sen değilsin.”</p>
      <span class="sign">— Elif, 13 Ekim gecesi</span>
      <p style="font-size:13px;opacity:.7;margin-top:16px">Kaydın sonunda uzun bir sessizlik var. Sonra, çok uzakta, bir çocuk gülüyor.</p>
    `, () => {
      UI.subtitle('KEMAL', '...Elif?', 3.2);
      setTimeout(() => {
        if (!S.started || S.ending) return;
        S.pendingChoice = true;
      }, 2200);
    });
  }

  function playChoice() {
    S.pendingChoice = false;
    SFX.knock();
    UI.choice(
      'Kaseti ne yapacaksın?',
      'Kemal kapının arkasında. Elinde kaset var. Dört yıldır her gece 91.4\'ten kızının sesini yayınlıyor. Ya onu bu sesle baş başa bırakacaksın ya da kanıtı alıp gideceksin.',
      { label: 'Kaseti Kemal\'e ver', desc: 'Yıllardır beklediği sese onu götür.' },
      { label: 'Kaseti al ve kaç', desc: 'Kanıt sende kalsın; gerisini polis çözsün.' },
      () => finish(true),
      () => finish(false)
    );
  }

  function finish(good) {
    if (S.ending) return;
    S.ending = true;
    S.chapter = 6;
    UI.hideChoice();
    AI.enabled = false;
    SFX.endingTone(good);
    const t = formatTime(S.elapsed);
    if (good) {
      UI.ending({
        kicker: 'SON — SESİNİ DUYDU',
        title: 'SESSİZ EV',
        text: `<p>Kaseti Kemal'in eline bıraktın. Dört yıl sonra ilk kez bir insan sesi duydu; kendi kızının sesini.</p>
               <p>Dizlerinin üstüne çöktü. Sonra, dört yıldır ilk kez, evden çıktı. Polisi kendisi aradı. Elif'in dosyası yeniden açıldı.</p>
               <p>Şafakta ambulansın ışıkları mahalleyi kesti. Sen kapının önünde dururken radyo sustu.</p>`,
        stats: [{ label: 'SÜRE', value: t }, { label: 'YAKALANMA', value: String(S.caughtCount) }, { label: 'KANIT', value: S.evidence.length + '/3' }]
      });
    } else {
      UI.ending({
        kicker: 'SON — SESSİZLİK',
        title: 'KASET',
        text: `<p>Kaseti cebine attın ve arka kapıdan çıktın. Polis kaydı dinledi; dosya yeniden açıldı.</p>
               <p>Ama Kemal Bey o geceyi pencerede geçirdi. Ertesi gece radyo yine 91.4'teydi.</p>
               <p>Bir kaset bir kızı geri getirmiyor. Bazen sadece bir adamın neden hiç durmadığını anlatıyor.</p>`,
        stats: [{ label: 'SÜRE', value: t }, { label: 'YAKALANMA', value: String(S.caughtCount) }, { label: 'KANIT', value: S.evidence.length + '/3' }]
      });
    }
    UI.showHUD(false);
    UI.hiding(false);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function caught() {
    if (S.ending || S.caughtTimer > 0) return;
    S.caughtCount++;
    S.caughtTimer = 3.4;
    if (window.UI) {
      UI.hiding(false);
      UI.caught(CAUGHT_LINES[(Math.random() * CAUGHT_LINES.length) | 0]);
    }
    SFX.stinger();
    SFX.shout();
    AI.enabled = false;
  }

  function respawn() {
    UI.hideCaught();
    UI.setSuspicion(0, false);
    PLAYER.reset();
    PLAYER.setPosition(S.checkpoint.x, S.checkpoint.y, S.checkpoint.z, S.checkpoint.yaw);
    AI.reset();
    AI.enabled = true;
    SFX.setChase(false);
    UI.toast('Kemal seni dışarı attı. Tekrar dene.');
    if (S.chapter === 1) S.checkpoint = { x: -4.5, y: 0, z: -13.6, yaw: Math.PI };
  }

  /* ---------- etkileşim ---------- */
  function interact(item) {
    if (!item) return;
    const id = item.id;

    switch (id) {
      case 'photo':
        item.used = true;
        addEvidence('photo');
        openNote('AİLE FOTOĞRAFI', `
          <p>Kemal, eşi ve küçük bir kız. Bahçedeki elma ağacının altında, güneşli bir gün.</p>
          <p>Fotoğrafın sağ kenarı kesilmiş. Geriye yalnızca bir adamın omzu ve radyo vericisinin anteni kalmış.</p>
          <p class="sign">Elif — 9 yaş</p>
        `);
        break;

      case 'diary':
        item.used = true;
        addEvidence('diary');
        openNote('ELİF\'İN GÜNLÜĞÜ', `
          <p><em>12 Ekim.</em> Babam geceleri bodrumda. Radyodan bir ses geliyor. Kendi sesim gibi.</p>
          <p><em>13 Ekim.</em> Öğretmenime söyledim. “Baban seni seviyor,” dedi. Herkes öyle diyor.</p>
          <p><em>14 Ekim.</em> Parkta bir adam vardı. Bana “annen seni bekliyor” dedi. Yalan söyledi.</p>
          <p>Bu sayfadan sonrası yırtılmış. Ciltte bir çivi izi var.</p>
        `);
        break;

      case 'letter':
        item.used = true;
        addEvidence('letter');
        openNote('GÖNDERİLMEMİŞ MEKTUP', `
          <p><em>Sana,</em></p>
          <p>Bu mektubu yazdığım gün parktaki sıraya oturmuştum. Babam gelmedi. Ben de eve yürüdüm. O gece bir daha konuşmadık.</p>
          <p>Eğer bunu okuyorsan, sana verdiğim tavşanı hâlâ saklıyor musun? Kulaklarından birini koparmıştım. Özür dilerim.</p>
          <p>Babam kötü bir insan değil. Sadece sesimi kaybetmekten korkuyor. Belki bir gün bunu biri ona anlatır.</p>
          <span class="sign">— Elif</span>
        `);
        break;

      case 'drawer':
        item.used = true;
        S.hasKey = true;
        SFX.keyUse();
        UI.toast('Paslı bir anahtar buldun.');
        UI.subtitle('SEN', 'Çalışma odasının anahtarı olmalı.', 2.6);
        if (S.chapter === 2) setObjective();
        break;

      case 'studyDoor': {
        const d = WORLD.doors.study;
        if (d && d.unlocked) {
          UI.toast('Kapı açık.');
        } else if (S.hasKey) {
          WORLD.unlockStudy();
          item.used = true;
          UI.toast('Çalışma odası açıldı.');
        } else {
          SFX.locked();
          UI.subtitle('SEN', 'Kilitli. Mutfakta bir anahtar görmüştüm.', 3);
        }
        break;
      }

      case 'fuse_shed':
        item.used = true;
        WORLD.hideFuse('shed');
        addFuse('shed');
        break;
      case 'fuse_bath':
        item.used = true;
        WORLD.hideFuse('bath');
        addFuse('bath');
        break;
      case 'fuse_bedroom':
        item.used = true;
        WORLD.hideFuse('bedroom');
        addFuse('bedroom');
        break;

      case 'fuseBox':
        installFuses();
        break;

      case 'basementDoor':
        if (S.power) {
          UI.toast('Bodrum açık. İçerisi buz gibi.');
          SFX.doorOpen();
        } else {
          SFX.locked();
          UI.subtitle('SEN', 'Kilitli. Elektrik gelmeden açılmıyor.', 3);
        }
        break;

      case 'tape':
        item.used = true;
        openTape();
        break;

      case 'poster_yard':
        openNote('KAYIP İLANI', `
          <p><b>ELİF K.</b> — 11 yaşında, kahverengi saçlı. Son görüldüğü yer: mahalle parkı. 14 Ekim.</p>
          <p>İlanın altına birisi kurşun kalemle not düşmüş: <em>“Babası her gece radyoyu açık bırakıyor.”</em></p>
          <p>Kağıdın arkası yağmurdan şişmiş. Dört yıldır burada asılı.</p>
        `);
        break;

      case 'note_fridge':
        openNote('BUZDOLABINDAKİ NOT', `
          <p><em>Elif, bu akşam seni almaya geleceğim. Parkta bekleme, hava soğuk.</em></p>
          <p class="sign">— Baba, 14 Ekim</p>
          <p>Not sararmış ama hiç yerinden alınmamış.</p>
        `);
        break;

      case 'toy_rabbit':
        openNote('OYUNCAK TAVŞAN', `
          <p>Kulağının biri kopmuş, sonra özenle dikilmiş. Dikişler çocuk elinden çıkmış gibi eğri.</p>
          <p>Altında, solmuş bir etiket: <em>“Elif — 6 yaş.”</em></p>
        `);
        break;

      case 'bulletin':
        openNote('DUVAR PANOSU', `
          <p>Elif'in fotoğrafları, parkın haritası, kırmızı iple birbirine bağlanmış tarihler.</p>
          <p>Ortada büyük harflerle: <em>“14 EKİM — 21:40 — Park.”</em></p>
          <p>Haritanın üstüne defalarca aynı kelime yazılmış: <b>BODRUM</b>.</p>
        `);
        break;

      case 'radio':
        SFX.keyUse();
        SFX.radioStatic(1.8);
        openNote('ESKİ RADYO', `
          <p>İğne 91.4'e sabitlenmiş. Cihazın arkasında bir kaset yuvası ve mikrofon girişi var.</p>
          <p>Hoparlörden sadece cızırtı geliyor. Ama kapatmak için düğme yok; düğme sökülmüş.</p>
        `);
        break;

      case 'transmitter':
        SFX.radioStatic(2.4);
        openNote('VERİCİ', `
          <p>Kemal Bey'in atölyesi. Tozlu bir verici, bir mikrofon ve her gece 91.4'ten yayına giren bir kayıt düzeneği.</p>
          <p>Yanındaki raf etiketinde tek bir cümle: <em>“Elif duyarsa döner.”</em></p>
        `);
        break;

      case 'basementBoard':
        openNote('BODRUM PANOSU', `
          <p>Arama ekibinin haritaları, kayıp ilanları ve dört yıldır güncellenen bir defter.</p>
          <p>Son sayfa: <em>“Bugün de gelmedi. Yayına devam.”</em></p>
        `);
        break;

      case 'frontDoor':
        SFX.locked();
        UI.subtitle('SEN', 'Ön kapı dışarıdan tahtalanmış. Bu evden kimse çıkmak istemiyor.', 3.4);
        break;

      default:
        break;
    }
  }

  function update(dt, active) {
    if (!S.started || S.ending) return;

    if (S.caughtTimer > 0) {
      S.caughtTimer -= dt;
      if (S.caughtTimer <= 0) respawn();
      return;
    }

    if (active) S.elapsed += dt;

    if (S.chapter === 1 && PLAYER.inside && PLAYER.pos.y > -0.5) beginChapter2();

    if (UI.noteOpen) { S.lastNoteOpen = true; return; }
    if (S.lastNoteOpen) {
      S.lastNoteOpen = false;
      if (S.pendingNoteAfter) {
        const fn = S.pendingNoteAfter;
        S.pendingNoteAfter = null;
        fn();
      }
    }

    if (S.pendingChoice && !UI.choiceOpen) playChoice();
  }

  return {
    init, startGame, update, interact, caught,
    get chapter() { return S.chapter; },
    get evidence() { return S.evidence; },
    get fuses() { return S.fuses; },
    get started() { return S.started; },
    get ending() { return S.ending; },
    get caughtCount() { return S.caughtCount; },
    get elapsed() { return S.elapsed; },
    state: S
  };
})();
