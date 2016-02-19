//=============================================================================
/*:
 * @plugindesc v1.00 - Addon for SkillLearnSystem.
 * Show locked skills and give information on how to unlock.
 * @author Corniflex
 *
 * @param ---General---
 * @default
 *
 * @param Show Locked Skills
 * @desc Show the skills which level requirement are not met.
 * NO - false     YES - true
 * @default true
 *
 * @param Level Requirement Text
 * @desc Text used to display the level requirement for the skill.
 * @default Level Requirement
 *
 * @param Level Requirement Icon
 * @desc Icon used to display the level requirement for the skill.
 * @default 77
 *
 * @param Show Skill Type
 * @desc Show the skill type in the right panel ?
 * NO - false     YES - true
 * @default true
 *
 * @param Skill Type Text
 * @desc Text used to display the skill type.
 * @default Skill Type
 *
 * @param Skill Sort Type
 * @desc Type of sorting for skill list
 * 0 - ID     1 - Name     2 - Level Req
 * @default 2
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
Corniflex.Parameters = PluginManager.parameters('Corniflex_YEPAddons_SLS');


Corniflex.YEP.Param.ShowOutlevel = eval(Corniflex.Parameters['Show Locked Skills']);
Corniflex.YEP.Param.LearnLevelText = String(Corniflex.Parameters['Level Requirement Text']);
Corniflex.YEP.Param.LearnLevelIcon = Number(Corniflex.Parameters['Level Requirement Icon']);
Corniflex.YEP.Param.ShowSkillType = eval(Corniflex.Parameters['Show Skill Type']);
Corniflex.YEP.Param.SkillTypeText = String(Corniflex.Parameters['Skill Type Text']);
Corniflex.YEP.Param.SortOrder = Number(Corniflex.Parameters['Skill Sort Type']);

//============================================================================= 
// Magic Begins
//=============================================================================

//============================================================================= 
// Window_SkillLearn
//=============================================================================
Window_SkillLearn.prototype.makeItemList = function() {
    if (this._actor && this.getClass()) {
      this.createSkillLearnData(!Corniflex.YEP.Param.ShowOutlevel);
    } else {
      this._data = [];
    }
};

Window_SkillLearn.prototype.createSkillLearnData = function(needLevel) {
    if (needLevel == undefined) needLevel = true;
    this._data = [];
    for (var i = 0; i < this.getClass().learnSkills.length; ++i) {
      var skillId = this.getClass().learnSkills[i];
      var skill = $dataSkills[skillId];
      if (skill && this.includes(skill, needLevel)) this._data.push(skill);
    }
    switch (Corniflex.YEP.Param.SortOrder) {
    case 1:
        this._data = this._data.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
    case 2:
        this._data = this._data.sort(function(a, b) { return a.learnRequireLevel - b.learnRequireLevel; });
        break;
    default:
        this._data = this._data.sort(function(a, b) { return a.id - b.id; });
    }
    this._data = this._data.filter(Yanfly.Util.onlyUnique);
};

Window_SkillLearn.prototype.includes = function(skill, needLevel) {
    if (!this.meetsRequirements(skill, needLevel)) return false;
    return true;
};

Window_SkillLearn.prototype.meetsRequirements = function(skill, needLevel) {
    var evalValue = this.getEvalLine(skill.learnShowEval);
    if (evalValue !== undefined) return evalValue;
    if (Imported.YEP_ClassChangeCore) {
      var classLevel = this._actor.classLevel(this._classId);
      if (skill.learnRequireLevel > classLevel && needLevel) return false;
    } else {
      if (skill.learnRequireLevel > this._actor.level && needLevel) return false;
    }
    for (var i = 0; i < skill.learnRequireSkill.length; ++i) {
      var skillId = skill.learnRequireSkill[i];
      if (!$dataSkills[skillId]) continue;
      if (!this._actor.isLearnedSkill(skillId)) return false;
    }
    for (var i = 0; i < skill.learnRequireSwitch.length; ++i) {
      var switchId = skill.learnRequireSwitch[i];
      if (!$gameSwitches.value(switchId)) return false;
    }
    return true;
};

Window_SkillLearn.prototype.isEnabled = function(item) {
    if (!this._actor) return false;
    if (!item) return false;
    if (this._actor.isLearnedSkill(item.id)) return false;
    if ($gamePlayer.isDebugThrough()) return true;
    if (!this._actor.canLearnSkill(item, this._classId)) return false;
    if (!this.meetsRequirements(item, true)) return false;
    var evalValue = this.getEvalLine(item.learnRequireEval);
    if (evalValue !== undefined) return evalValue;
    return true;
};

//=============================================================================
// Window_SkillLearnData
//=============================================================================

Window_SkillLearnData.prototype.drawSkillData = function() {
    this.drawItemName(this._skill, 0, 0, this.contents.width);
    var wy = this.lineHeight();
    if (Corniflex.YEP.Param.ShowSkillType)
        wy = this.drawSkillTypeText(wy);
    wy = this.drawRequirements(wy);
    if (Corniflex.YEP.Param.ShowOutlevel) {
        wy = this.drawLevelRequirementText(wy);
        wy = this.drawLevelRequirement(wy);
    }
    wy = this.drawCostText(wy);
    wy = this.drawGoldCosts(wy);
    wy = this.drawJpCosts(wy);
    wy = this.drawOtherCosts(wy);
    wy = this.drawCustomText(wy);
    return wy;
};

Window_SkillLearnData.prototype.drawLevelRequirementText = function(wy) {
    if (!this._skill.learnRequireLevel > 0) return wy;
    var text = Corniflex.YEP.Param.LearnLevelText;
    this.changeTextColor(this.systemColor());
    this.drawText(text, 0, wy, this.contents.width, 'center');
    wy += this.lineHeight();
    return wy;
};

Window_SkillLearnData.prototype.drawLevelRequirement = function(wy) {
    if (this._skill.learnRequireLevel <= 0) return wy;
    var text = '';
    if (Corniflex.YEP.Param.LearnLevelIcon > 0) text = '\\i[' + Corniflex.YEP.Param.LearnLevelIcon + ']';
    text += TextManager.levelA;
    var wx = this.drawTextEx(text, 0, wy);
    var ww = this.contents.width - wx - 4;
    var costText = Yanfly.Util.toGroup(this._skill.learnRequireLevel);
    this.contents.fontSize = Yanfly.Param.SLSCostSize;
    var lvl = this._actor._level;
    if (Imported.YEP_ClassChangeCore)
      var lvl = this._actor.classLevel(this._classId);
    if (lvl >= this._skill.learnRequireLevel)
      this.changeTextColor(this.powerUpColor());
    else
      this.changeTextColor(this.powerDownColor());
    this.drawText(costText, wx, wy, ww, 'right');
    this.resetFontSettings();
    this.resetTextColor();
    wy += this.lineHeight();
    return wy;
};

Window_SkillLearnData.prototype.drawSkillTypeText = function(wy) {
    var text = Corniflex.YEP.Param.SkillTypeText;
    this.changeTextColor(this.systemColor());
    this.drawText(text, 0, wy, this.contents.width, 'center');
    wy += this.lineHeight();

    var text = $dataSystem.skillTypes[this._skill.stypeId];
    this.resetTextColor();
    this.drawText(text, 0, wy, this.contents.width, 'center');
    wy += this.lineHeight();
    return wy;
};