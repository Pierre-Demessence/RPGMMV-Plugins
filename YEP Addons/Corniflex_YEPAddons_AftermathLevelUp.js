//=============================================================================
/*:
 * @plugindesc v1.00 - Addon for AftermathLevelUp.
 * Will show unlocked classes and unlocked skills.
 * @author Corniflex
 *
 * @param ---Class Learn---
 * @default
 *
 * @param Enable Class List
 * @desc Enables/disables the display of unlocked classes.
 * NO - false     YES - true
 * @default true
 *
 * @param Class Text Singular
 * @desc Text used to display learned classes singular.
 * @default Acquired Class
 *
 * @param Class Text Plural
 * @desc Text used to display learned classes plural.
 * @default Acquired Classes
 *
 * @param Class List Width
 * @desc The pixel width of the class list if it appears.
 * @default 200
 *
 * @param ---Skill Learn Engine---
 * @default
 *
 * @param Show Skills Unlocked
 * @desc Display skills unlocked at level up? (W/ YEP_SkillLearnSystem)
 * NO - false     YES - true
 * @default true
 *
*/

//============================================================================= 
// Corniflex
//=============================================================================
var Corniflex       = Corniflex             || {};
Corniflex.YEP       = Corniflex.YEP         || {};
Corniflex.YEP.Param = Corniflex.YEP.Param   || {};

//=============================================================================
// Parameter Variables
//=============================================================================
Corniflex.Parameters = PluginManager.parameters('Corniflex_YEPAddons_AftermathLevelUp');

Corniflex.YEP.Param.ClassEnable = eval(Corniflex.Parameters['Enable Class List']);
Corniflex.YEP.Param.ClassSing = String(Corniflex.Parameters['Class Text Singular']);
Corniflex.YEP.Param.ClassPlur = String(Corniflex.Parameters['Class Text Plural']);
Corniflex.YEP.Param.ClassWidth = Number(Corniflex.Parameters['Class List Width']);
Corniflex.YEP.Param.ShowSkillsUnlocked = eval(Corniflex.Parameters['Show Skills Unlocked']);

//============================================================================= 
// Magic Begins
//=============================================================================

//============================================================================= 
// YEP_VictoryAftermath
//=============================================================================

Game_Actor.prototype.getLearnableSkills = function() {
    if (!Imported.YEP_SkillLearnSystem) return [];
    var skillLearnWindow = new Window_SkillLearn(0, 0, 0, 0);
    skillLearnWindow.hide();
    skillLearnWindow.setActor(this);
    skillLearnWindow.createSkillLearnData();
    return (skillLearnWindow._data.slice());
}

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

Corniflex.YEP.
BattleManager_prepareVictoryPreLevel = BattleManager.prepareVictoryPreLevel;
BattleManager.prepareVictoryPreLevel = function() {
    $gameParty.allMembers().forEach(function(actor) {
        if (Corniflex.YEP.Param.ShowSkillsUnlocked)
            actor._preVictoryLearneableSkills = actor.getLearnableSkills();
        actor._victoryClasses = [];
    }, this);
    Corniflex.YEP.BattleManager_prepareVictoryPreLevel.call(this);
};

Corniflex.YEP.
BattleManager_prepareVictoryPostLevel = BattleManager.prepareVictoryPostLevel;
BattleManager.prepareVictoryPostLevel = function() {
    $gameParty.allMembers().forEach(function(actor) {
        if (Corniflex.YEP.Param.ShowSkillsUnlocked) {
            actor.getLearnableSkills().diff(actor._preVictoryLearneableSkills).forEach(function (skill) {
                actor._victorySkills.push(skill.id);
            });
        }
    }, this);
    Corniflex.YEP.BattleManager_prepareVictoryPostLevel.call(this);
};

Corniflex.YEP.
Game_Actor_clearVictoryData = Game_Actor.prototype.clearVictoryData;
Game_Actor.prototype.clearVictoryData = function() {
    Corniflex.YEP.Game_Actor_clearVictoryData.call(this);
    this._victoryClasses = undefined;
};

Corniflex.YEP.
Game_Actor_unlockClass = Game_Actor.prototype.unlockClass;
Game_Actor.prototype.unlockClass = function(classId) {
    if (this._victoryPhase) {
      this._victoryClasses.push(classId);
    }
    Corniflex.YEP.Game_Actor_unlockClass.call(this, classId);
};

//============================================================================= 
// YEP_X_AftermathLevelUp
//=============================================================================

//=============================================================================
// Window_VictorySkills
//=============================================================================
Corniflex.YEP.
Window_VictoryLevelUp_refresh = Window_VictoryLevelUp.prototype.refresh;
Window_VictoryLevelUp.prototype.refresh = function() {
    Corniflex.YEP.Window_VictoryLevelUp_refresh.call(this);
    if (Corniflex.YEP.Param.ClassEnable) this.drawLearnedClassesTitle();
};

Window_VictoryLevelUp.prototype.widthArea = function() {
    if (this._widthArea) return this._widthArea;
    var widthArea = Yanfly.Param.ALUSkillWidth + this.standardPadding() * 2;
    if (Corniflex.YEP.Param.ClassEnable) widthArea += Corniflex.YEP.Param.ClassWidth;
    var ww = Window_Base._faceWidth;
    this._widthArea = Math.max(ww, widthArea);
    return this._widthArea;
};

Window_VictoryLevelUp.prototype.drawActorAppearance = function() {
    var ww = Window_Base._faceWidth;
    var wh = Window_Base._faceHeight;
    var wx = this.standardPadding();
    var wy = 0;
    this.drawActorFace(this._actor, wx, wy, ww, wh);
    var text = this._actor.name();
    this.drawText(text, 0, wh, Window_Base._faceWidth + this.standardPadding() * 2, 'center');
    this.changeTextColor(this.powerUpColor());
    var text = '+' + Yanfly.Util.toGroup(this._actor._expGained) + ' ';
    text += TextManager.exp;
    this.drawText(text, 0, wh + this.lineHeight(), Window_Base._faceWidth + this.standardPadding() * 2, 'center');
};

Corniflex.YEP.
Window_VictoryLevelUp_itemRect = Window_VictoryLevelUp.prototype.itemRect;
Window_VictoryLevelUp.prototype.itemRect = function(index) {
    var rect = Corniflex.YEP.Window_VictoryLevelUp_itemRect.call(this, index);
    rect.x = Window_Base._faceWidth + this.standardPadding() * 2;
    rect.width = this.contents.width;
    rect.width -= this.widthArea() + Window_Base._faceWidth + this.standardPadding() * 2;
    return rect;
};

Window_VictoryLevelUp.prototype.drawLearnedSkillsTitle = function() {
    var total = this._actor._victorySkills.length;
    if (total <= 0) return;
    this.resetFontSettings();
    this.resetTextColor();
    this.changeTextColor(this.systemColor());
    if (total > 1) {
      var text = Yanfly.Param.ALUSkillPlur;
    } else {
      var text = Yanfly.Param.ALUSkillSing;
    }
    var rect = this.itemRect(0);
    var wx = rect.x + rect.width + this.standardPadding()*2;
    if (Corniflex.YEP.Param.ClassEnable) wx += Corniflex.YEP.Param.ClassWidth;
    var wy = 0;    
    this.drawText(text, wx, wy, Yanfly.Param.ALUSkillWidth, 'center');
};

Window_VictoryLevelUp.prototype.drawLearnedClassesTitle = function() {
    var total = this._actor._victoryClasses.length;
    if (total <= 0) return;
    this.resetFontSettings();
    this.resetTextColor();
    this.changeTextColor(this.systemColor());
    if (total > 1) {
      var text = Corniflex.YEP.Param.ClassPlur;
    } else {
      var text = Corniflex.YEP.Param.ClassSing;
    }
    var rect = this.itemRect(0);
    var wx = rect.x + rect.width + this.standardPadding();
    var wy = 0;
    this.drawText(text, wx, wy, Corniflex.YEP.Param.ClassWidth, 'center');
};

//=============================================================================
// Window_VictorySkills
//=============================================================================

Window_VictorySkills.prototype.windowWidth = function() {
    if (this._widthArea) return this._widthArea;
    var widthArea = Yanfly.Param.ALUSkillWidth + this.standardPadding() * 2;
    var ww = Window_Base._faceWidth;
    this._widthArea = Math.max(ww, widthArea);
    return this._widthArea;
};

//=============================================================================
// Window_VictoryClasses - NEW
//=============================================================================

function Window_VictoryClasses() {
    this.initialize.apply(this, arguments);
}

Window_VictoryClasses.prototype = Object.create(Window_VictorySkills.prototype);
Window_VictoryClasses.prototype.constructor = Window_VictoryClasses;

Window_VictoryClasses.prototype.initialize = function(actor) {
    var ww = this.windowWidth();
    var wx = Graphics.boxWidth - ww - Yanfly.Param.ALUSkillWidth - this.standardPadding();
    var wh = this.windowHeight();
    var wy = Graphics.boxHeight - wh;
    Window_Selectable.prototype.initialize.call(this, wx, wy, ww, wh);
    this.opacity = 0;
    this.openness = 0;
    this.setActor(actor);
};

Window_VictoryClasses.prototype.windowWidth = function() {
    if (this._widthArea) return this._widthArea;
    var widthArea = Corniflex.YEP.Param.ClassWidth + this.standardPadding() * 2;
    var ww = Window_Base._faceWidth;
    this._widthArea = Math.max(ww, widthArea);
    return this._widthArea;
};

Window_VictoryClasses.prototype.setActor = function(actor) {
    this._actor = actor;
    this.select(0);
    if (this._actor._victoryClasses.length <= 0) this.select(-1);
    this.activate();
    this.refresh();
};

Window_VictoryClasses.prototype.makeItemList = function() {
    this._data = this._actor._victoryClasses.slice();
};

Window_VictoryClasses.prototype.drawItem = function(index) {
    var item = $dataClasses[this._data[index]];
    if (!item) return;
    var rect = this.itemRect(index);
    this.drawItemName(item, rect.x, rect.y, rect.width);
};

//=============================================================================
// Scene_Battle
//=============================================================================

Corniflex.YEP.
Scene_Battle_finishVictoryLevelUp = Scene_Battle.prototype.finishVictoryLevelUp;
Scene_Battle.prototype.finishVictoryLevelUp = function() {
    if (Corniflex.YEP.Param.ClassEnable) {
        this._victoryClassesWindow.close();
        this._victoryClassesWindow.deactivate();
    }
    Corniflex.YEP.Scene_Battle_finishVictoryLevelUp.call(this);
};

Corniflex.YEP.
Scene_Battle_setupNextAftermathLevelUpActor = Scene_Battle.prototype.setupNextAftermathLevelUpActor;
Scene_Battle.prototype.setupNextAftermathLevelUpActor = function() {
    Corniflex.YEP.Scene_Battle_setupNextAftermathLevelUpActor.call(this);
    if (Corniflex.YEP.Param.ClassEnable) {
        if (!this._victoryClassesWindow) {
            this._victoryClassesWindow = new Window_VictoryClasses(this._levelUpActor);
            this.addChild(this._victoryClassesWindow);
            this._victoryClassesWindow.open();
        }
        else {
            if (Corniflex.YEP.Param.ClassEnable) this._victoryClassesWindow.setActor(this._levelUpActor);
        }
    }
};
