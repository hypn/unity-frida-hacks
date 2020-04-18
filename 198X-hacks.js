import Enumerator from './enumerator.js'
import { MonoApiHelper } from 'frida-mono-api'

var globalState = {};   // used for Kill Screen

var cheatOutput = true; // using "console.log" seems to slow the game down


// -- GAME START -------------------------------------------------------------------
var mainMenu = Enumerator.enumerateClass('MainMenu');
MonoApiHelper.Intercept(mainMenu.address, 'StartSelectedScene', {
  onEnter: function(args) {
    // this.instance = args[0];

    globalState = {}; // reset global state between games

    var sceneName = Enumerator.readString(args[1]);

    // replace names if we can
    switch(sceneName) {
      case 'BeatEmUpSubwayInside':
        sceneName = 'Beating Heart';
        break;

      case 'TitleScene':
        sceneName = 'Out Of The Void';
        break;

      case 'RaceTitle':
        sceneName = 'The Runaway';
        break;

      case 'NinjaTitleScreen':
        sceneName = 'Shadowplay';
        break;

      case 'TitleSceneRPG':
        sceneName = 'Kill Screen';
        break;

      case '_Credits':
        sceneName = 'Credits';
        break;
    }

    console.log('\n[*] STARTED PLAYING: ' + sceneName);
  }
});


// -- BEATING HEART, OUT OF THE VOID and SHADOWPLAY: invulnerability ---------------
var takeDamage = Enumerator.enumerateClass('TakeDamage');
MonoApiHelper.Intercept(takeDamage.address, 'Damage', {
  onEnter: function(args) {
    this.instance = args[0];

    // check if the player is receiving damage, and if so then set "dead" flag
    // (damage code is skipped if the object receiving it is flagged as "dead")
    var playerCheck1 = takeDamage.getValue(this.instance, 'isPlayerCharacter'); // for "beating heart" and "shadowplay"
    var playerCheck2 = (takeDamage.getValue(this.instance, 'maxHealth') === 3); // for "out of the void"

    if (playerCheck1 || playerCheck2) {
      if (cheatOutput) {
        console.log('[+] Player took damage, pretending to be dead to avoid it...');
      }
      takeDamage.setValue(this.instance, 'dead', true);
      this.resetDeadFlag = true; // tell "onLeave" (below) to reset this
    }
  },

  onLeave: function(retval) {
    if (this.resetDeadFlag) {
      takeDamage.setValue(this.instance, 'dead', false);
    }
  }
});


// -- THE RUNAWAY: no collisions or speed losses -----------------------------------
var carController = Enumerator.enumerateClass('CarController');
MonoApiHelper.Intercept(carController.address, 'SetSpeed', {
  onEnter: function(args) {
    this.instance = args[0];

    // prevent going "off-road" from reducing speed
    // (the offRoadDeceleration value is subtracted from current speed)
    carController.setValue(this.instance, 'offRoadDeceleration', 0.0);
  }
});

MonoApiHelper.Intercept(carController.address, 'OnCollision', {
  onEnter: function(args) {
    this.instance = args[0];

    if (cheatOutput) {
      console.log('[+] Collision! Removing speed loss and disabling wipeout');
    }

    // prevent collisions with other cars from reducing speed
    // (current speed is multiplied by collisionSpeedLoss, set it to 1 to prevent it from changing)
    carController.setValue(this.instance, 'collisionSpeedLoss', 1.0);

    // prevent collisions with objects form causing a "wipeout"
    // (the "shouldCauseWipeout" property of the sprite is checked to determine this, set it to false to prevent wipeouts)
    //
    // NOTE: a "RoadRenderer.Sprite" object is passed in to "OnCollision"
    // this "Enumerator" can't find the nested sprite class, so this has to be done manually...
    // the "0x44" offset is from CheatEngine, and we add it to the sprite address to reference "shouldCauseWipeout"
    var spriteAddr = parseInt(args[1]);
    var wipeoutAddr = spriteAddr + 0x44;
    Enumerator.setFieldValue(wipeoutAddr, 'boolean', false);
  }
});


// -- KILL SCREEN: invulnerability -------------------------------------------------
var rpgController = Enumerator.enumerateClass('RPGController');
var status = Enumerator.enumerateClass('Status'); // used to update on-screen RGP text (eg: health)

MonoApiHelper.Intercept(rpgController.address, 'EnemyAttack', {
  onEnter: function(args) {
    this.instance = args[0];
    var damage = parseInt(args[1]);

    // get the current health value, to set health back to after damage
    // (we can't change the incoming damage value to 0 unfortunately)
    var health = rpgController.getValue(this.instance, 'health');
    if (cheatOutput) {
      console.log('[+] Player took RPG damage: '+ damage + ', health (before damage) was: ' + health);
    }

    // we could set the health back in the "onLeave" for "EnemyAttack", but then the health displayed in-game looks like we took damage
    // instead we'll reset the health before the UI (and displayed health) is updated so it can stay at full health
    globalState.contollerAddress = this.instance;
    globalState.healthWas = health;
    globalState.updateHealth = true;
  }
});

MonoApiHelper.Intercept(status.address, 'UpdateStatusText', {
  onEnter: function(args) {
    // make sure we want to update health (NOT during game start or level up)
    if (globalState.contollerAddress && globalState.updateHealth) {
      if (cheatOutput) {
        console.log('[+] Resetting RPG health to:', globalState.healthWas);
      }

      // set the health back to what it was previously - before the UI update
      // using the RPG Controller's address, rather than this "Status" object's instance address!
      var health = rpgController.setValue(globalState.contollerAddress, 'health', globalState.healthWas);

      // clear the flag for future level-ups or game restarts
      globalState.resetHealth = false;
    }
  }
});
