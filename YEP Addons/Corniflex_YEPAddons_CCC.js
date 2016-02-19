//=============================================================================
/*:
 * @plugindesc v1.00 - Addon for ClassChangeCore.
 * Show locked classes and give information on how to unlock.
 * @author Corniflex
 *
 * @param ---General---
 * @default
 *
 * @param Show Unlockable Classes
 * @desc Show the classes not yet unlocked ?
 * NO - false     YES - true     Default: false
 * @default true
 *
 * @param Requirements Text
 * @desc Text used to list what are the requirements for the class.
 * @default Unlock Requirements
 *
 * @param Class Tree
 * @desc Show a tree instead of a list ?
 * NO - false     YES - true     Default: false
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
Corniflex.Parameters = PluginManager.parameters('Corniflex_YEPAddons_CCC');

Corniflex.YEP.Param.Unlockable = eval(Corniflex.Parameters['Show Unlockable Classes']);
Corniflex.YEP.Param.RequirementsText = String(Corniflex.Parameters['Requirements Text']);
Corniflex.YEP.Param.ClassTree = eval(Corniflex.Parameters['Class Tree']);

//============================================================================= 
// Magic Begins
//=============================================================================

Corniflex.YEP.DataManager_processCCCNotetags3 = DataManager.processCCCNotetags3;
DataManager.processCCCNotetags3 = function(group) {
    function setClassLinks() {
        obj.levelUnlockRequirements[classId] = level;
        if (!$dataClasses[classId].levelUnlock)
        $dataClasses[classId].levelUnlock = {};
        $dataClasses[classId].levelUnlock[obj.id] = level;
    }
    Corniflex.YEP.DataManager_processCCCNotetags3.call(this, group);
    
    var evalMode = 'none';
    for (var n = 1; n < group.length; n++) {
        var obj = group[n];
        var notedata = obj.note.split(/[\r\n]+/);
        
        for (var i = 0; i < notedata.length; i++) {
            var line = notedata[i];
            if (line.match(/<(?:LEVEL UNLOCK REQUIREMENTS)>/i)) {
                evalMode = 'level unlock requirements';
            } else if (line.match(/<\/(?:LEVEL UNLOCK REQUIREMENTS)>/i)) {
                evalMode = 'none';
            } else if (evalMode === 'level unlock requirements') {
                if (line.match(/CLASS[ ](\d+):[ ]LEVEL[ ](\d+)/i)) {
                    var classId = parseInt(RegExp.$1);
                    var level = parseInt(RegExp.$2);
                    setClassLinks()
                } else if (line.match(/(.*):[ ]LEVEL[ ](\d+)/i)) {
                    var name = String(RegExp.$1).toUpperCase();
                    var level = parseInt(RegExp.$2);
                    var classId = Yanfly.ClassIdRef[name];
                    if (classId) setClassLinks();
                }
            }
        }
    }
};

//=============================================================================
// Game_Actor
//=============================================================================

Game_Actor.prototype.unlockableClasses = function() {
    if (this._unlockableClasses)
        return this._unlockableClasses;
    var classes = this.unlockedClasses();
    for (var i = 0 ; i < classes.length ; ++i) {
        if (classes[i] > 0)
            for (var id in $dataClasses[classes[i]].levelUnlock) {
                classes.push(parseInt(id));
            }
    }
    this._unlockableClasses = [];
    for (var i = 0 ; i < classes.length ; ++i) {
        if (classes[i] > 0 && this.canUnlockClass(classes[i]))
            this._unlockableClasses.push(classes[i]);
    }
    this._unlockableClasses = this._unlockableClasses.concat(this.unlockedClasses());
    return this._unlockableClasses.filter(Yanfly.Util.onlyUnique);
};

Game_Actor.prototype.canUnlockClass = function(classId) {
    if (this.unlockedClasses().contains(classId)) {
        return (true);
    }
    var i = 0;
    for (var id in $dataClasses[classId].levelUnlockRequirements) {
        id = parseInt(id);
        if (!this.unlockedClasses().contains(id) && !this.canUnlockClass(id))
            return (false);
        ++i;
    }
    return (i > 0);
}

Game_Actor.prototype.classUnlockLevelRequirementsMet = function(item) {
    var classId;
    if (this._unlockedClasses.contains(item.id)) return true;
    for (classId in item.levelUnlockRequirements) {
      var level = item.levelUnlockRequirements[classId];
      if (this.classLevel(classId) < level) return false;
    }
    return true;
};

//=============================================================================
// Window_ClassList
//=============================================================================

Window_ClassList.prototype.makeItemList = function() {
    if (this._actor) {
        var data = (Corniflex.YEP.Param.Unlockable ? this._actor.unlockableClasses().slice() : this._actor.unlockedClasses().slice());
    } else {
        var data = [];
    }
    this._data = [];
    for (var i = 0; i < data.length; ++i) {
      var classId = data[i];
      if ($dataClasses[classId] && !this._data.contains(classId)) {
        this._data.push(classId);
      }
    }
    this._data.sort(function(a, b) { return a - b });
};

Window_ClassList.prototype.isEnabled = function(item) {
    return this._actor.classUnlockLevelRequirementsMet($dataClasses[item]);
};

Window_ClassList.prototype.drawDarkRect = function(dx, dy, dw, dh, color) {
    var color = color || this.gaugeBackColor();
    this.changePaintOpacity(false);
    this.contents.fillRect(dx, dy, dw, dh, color);
    this.changePaintOpacity(true);
};

Window_ClassList.prototype.drawItem = function(index) {
    var item = $dataClasses[this._data[index]];
    if (!item) return;
    var rect = this.itemRect(index);
    if (Corniflex.YEP.Param.ClassTree) {
        this.changeClassNameColor(item);
        this.drawDarkRect(rect.x, rect.y, rect.width, this.lineHeight(), this.contents.textColor);
        for (var id in item.levelUnlock) {
            id = parseInt(id);
            if (!this._data.contains(id)) continue;
            
            var rectDest = this.itemRect(this._data.indexOf(id));
            var headlen = 10;   // length of head in pixels
            var fromx = rect.x + rect.width;
            var fromy = rect.y + rect.height / 2;
            var tox = rectDest.x - 1;
            var toy = rectDest.y + rectDest.height / 2;
            var angle = Math.atan2(toy-fromy,tox-fromx);

            this.contents.context.beginPath();
            this.contents.context.moveTo(fromx, fromy);            
            this.contents.context.lineTo(tox, toy);
            this.contents.context.moveTo(tox, toy);
            this.contents.context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
            this.contents.context.moveTo(tox, toy);
            this.contents.context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
            this.contents.context.lineTo(tox,toy)
            if (this._actor.classLevel(item.id) >= item.levelUnlock[id]) {
                this.contents.context.strokeStyle = this.powerUpColor();
                this.changeTextColor(this.powerUpColor());
            }
            else {
                this.contents.context.strokeStyle = "grey";
                this.changeTextColor(this.powerDownColor());
            }
            this.contents.context.lineWidth = 2;
            this.contents.context.lineCap = 'round';
            this.contents.context.stroke();
            
            this.contents.fontSize = Yanfly.Param.CCCLvFontSize;
            var text = Yanfly.Param.CCCLvFmt.format(item.levelUnlock[id]);
            this.drawText(text, (rectDest.x + rect.x) / 2, (rectDest.y + rect.y) / 2, 100, 100, "Center");
        }
    }
    this.changePaintOpacity(this.isEnabled(this._data[index]));
    this.drawClassName(item, rect.x, rect.y, rect.width);
    var rect = this.itemRectForText(index);
    if (!Corniflex.YEP.Param.ClassTree)
        this.drawClassLevel(item, rect.x, rect.y, rect.width);
    this.changePaintOpacity(true);
};

if (Corniflex.YEP.Param.ClassTree) {
    Window_ClassList.prototype.translucentOpacity = function() {
        return 75;
    };
}

Window_ClassList.prototype.getClassHierarchy = function(classId) {
    var cls = $dataClasses[classId];
    if (!cls) return (0);
    var rank = 1;
    for (var i in cls.levelUnlockRequirements) {
        i = parseInt(i);
        if (!this._data.contains(i)) return (1);
        var tmp = this.getClassHierarchy(i);
        rank = (tmp > rank ? tmp : rank);
    }
    if (!i) return (1);
    rank += 1;
    return (rank);
}

Window_ClassList.prototype.getMaxClassHierarchy = function() {
    var max = 0;
    for (var i in this._data) {
        var tmp = this.getClassHierarchy(this._data[i]);
        max = (tmp > max ? tmp : max);
    }
    return (max);
}

Window_ClassList.prototype.getClassesByHierarchy = function(hierarchy) {
    var classes = [];
    if (hierarchy == 0 || hierarchy > this.getMaxClassHierarchy()) return (classes);
    for (var i in this._data) {
        if (this.getClassHierarchy(this._data[i]) == hierarchy )
            classes.push(this._data[i]);
    }
    return (classes.filter(Yanfly.Util.onlyUnique));
}

Window_ClassList.prototype.itemRect = function(index) {
    var rect = new Rectangle();
    var maxCols = this.maxCols();
    rect.width = this.itemWidth();
    rect.height = this.itemHeight();
    rect.x = index % maxCols * (rect.width + this.spacing()) - this._scrollX;
    rect.y = Math.floor(index / maxCols) * rect.height - this._scrollY;

    if (Corniflex.YEP.Param.ClassTree) {
        var classId = this._data[index];
        var maxHierarchy = this.getMaxClassHierarchy();
        var hierarchy = this.getClassHierarchy(classId);
        
        rect.width = Window_Base._iconWidth + 3;
        rect.x = this.itemWidth() / maxHierarchy * (hierarchy - 1) + (this.itemWidth() / maxHierarchy / 2) - (rect.width / 2);
        
        var sameRank = this.getClassesByHierarchy(hierarchy);
        var lowerRankLength = this.getClassesByHierarchy(hierarchy-1).length;
        var sameRankLength = (sameRank.length < lowerRankLength ? lowerRankLength : sameRank.length);
        var spaces = (this.height - (this.padding + this.margin) * 2 - (sameRankLength * Window_Base._iconHeight)) / (sameRankLength + 1)
        rect.y = spaces * (sameRank.indexOf(classId) + 1) + Window_Base._iconHeight * sameRank.indexOf(classId);
    }
    return rect;
};

if (Corniflex.YEP.Param.ClassTree) {
    Yanfly.CCC.Window_ClassList_maxPageRows = Window_ClassList.prototype.maxPageRows;
    Window_ClassList.prototype.maxPageRows = function() {
        return (this._data ? this._data.length : Yanfly.CCC.Window_ClassList_maxPageRows.call(this));
    };

    Window_ClassList.prototype.cursorHandlerLR = function(wrap, classesList) {
        var nextClassId = 0;
        for (var id in classesList) {
            id = parseInt(id);
            if (!this._data.contains(id))
                continue;
            nextClassId = id;
            break;
        }
        if (nextClassId)
            this.select(this._data.indexOf(nextClassId));
    };
    
    Window_ClassList.prototype.cursorRight = function(wrap) {
        var cls = $dataClasses[this._data[this.index()]];
        this.cursorHandlerLR(wrap, cls.levelUnlock);
    };
    
    Window_ClassList.prototype.cursorLeft = function(wrap) {
        var cls = $dataClasses[this._data[this.index()]];
        this.cursorHandlerLR(wrap, cls.levelUnlockRequirements);
    };
    
    Window_ClassList.prototype.cursorHandlerUD = function(wrap, up) {
        var classId = this._data[this.index()];
        var sameHierarchy = this.getClassesByHierarchy(this.getClassHierarchy(classId));
        var inc = (up ? - 1 + sameHierarchy.length : 1);
        var nextClassId = sameHierarchy[(sameHierarchy.indexOf(classId) + inc) % sameHierarchy.length];
        if (nextClassId)
           this.select(this._data.indexOf(nextClassId));
    }
    
    Window_ClassList.prototype.cursorUp = function(wrap) {
        this.cursorHandlerUD(wrap, true);
    };
    
    Window_ClassList.prototype.cursorDown = function(wrap) {
        this.cursorHandlerUD(wrap, false);
    };
}

Window_ClassList.prototype.updateCompare = function() {
    var win = SceneManager._scene._commandWindow;
    if (win && win.currentSymbol() === 'subclass') {
        this.updateSubclassCompare();
    } else {
        if (this._actor && this.item() && this._statusWindow) {
            var actor = JsonEx.makeDeepCopy(this._actor);
            Yanfly.CCC.PreventReleaseItem = true;
            actor.changeClass(this.item(), false);
            Yanfly.CCC.PreventReleaseItem = undefined;
            this._statusWindow.setTempActor(actor);
        }
    }
};

Window_ClassList.prototype.updateSubclassCompare = function() {
    if (this._actor && this.item() && this._statusWindow) {
        var actor = JsonEx.makeDeepCopy(this._actor);
        Yanfly.CCC.PreventReleaseItem = true;
        actor.changeSubclass(this.item());
        Yanfly.CCC.PreventReleaseItem = undefined;
        this._statusWindow.setTempActor(actor);
    }
};

//=============================================================================
// Window_StatCompare
//=============================================================================

Window_StatCompare.prototype.refresh = function() {
    this.contents.clear();
    if (!this._actor) return;
    var y = 0;
    
    var classId = 0;
    if (this._tempActor && this._tempActor._classId != this._actor._classId)
            classId = this._tempActor._classId;
    else if (this._tempActor && this._tempActor._subclassId != this._actor._subclassId)
            classId = (this._tempActor._subclassId != 0 ? this._tempActor._subclassId : this._actor._subclassId);
    else
        classId = this._actor._classId;
    
    if (classId && Corniflex.YEP.Param.ClassTree)
        y = this.drawClassName(0, y, classId);
    
    for (var i = 0; i < 8; ++i) {
        y = this.drawItem(0, y, i);
    }
    
    if (!classId || !Corniflex.YEP.Param.Unlockable)
        return ;
    var requirements = [];
    for (var id in $dataClasses[classId].levelUnlockRequirements) {
        id = parseInt(id);
        if (!this._actor.unlockableClasses().contains(id))
            return ;
        requirements.push({id:id, lvl:$dataClasses[classId].levelUnlockRequirements[id]});
    }
    if (requirements.length > 0) {
        this.drawDarkRect(0, y, this.contents.width, this.lineHeight());
        this.changeTextColor(this.systemColor());
        this.drawText(Corniflex.YEP.Param.RequirementsText, 0, y, this.contents.width, 'center');
        y += this.lineHeight();
        for (var i = 0 ; i < requirements.length ; ++i)
            y = this.drawClassRequirement(0, y, requirements[i].id, requirements[i].lvl);
    }
};

Window_StatCompare.prototype.drawClassName = function(x, y, classId) {
    this.drawDarkRect(x, y, this.contents.width, this.lineHeight());
    x += this.textPadding();
    this.changeTextColor(this.systemColor());
    this.drawText($dataClasses[classId].name, x, y, this.contents.width, 'center');
    y += this.lineHeight()
    this.drawDarkRect(x, y, this.contents.width, this.lineHeight());
    this.drawText(Yanfly.Param.CCCLvFmt.format(this._actor.classLevel(classId)), x, y, this.contents.width, 'center');
    return (y + this.lineHeight());
};

Window_StatCompare.prototype.drawClassRequirement = function(x, y, classId, lvl) {
    this.drawDarkRect(x, y, this.contents.width, this.lineHeight());
    if (this._actor.classLevel(classId) >= lvl)
        this.changeTextColor(this.powerUpColor());
    else
        this.changeTextColor(this.powerDownColor());
    x += this.textPadding();
    this.drawIcon($dataClasses[classId].iconIndex, x, y);
    this.drawText($dataClasses[classId].name, x + Window_Base._iconWidth + 2, y, this.contents.width, 'left');
    this.drawText(Yanfly.Param.CCCLvFmt.format(lvl)+" ", x, y, this.contents.width, 'right');
    return (y + this.lineHeight());
};

Window_StatCompare.prototype.drawItem = function(x, y, paramId) {
    this.drawDarkRect(x, y, this.contents.width, this.lineHeight());
    this.drawParamName(y, paramId);
    this.drawCurrentParam(y, paramId);
    this.drawRightArrow(y);
    if (this._tempActor) {
        this.drawNewParam(y, paramId);
        this.drawParamDifference(y, paramId);
    }
    return (y + this.lineHeight());
};