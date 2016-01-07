var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
module.exports = 'typescript';
module.exports = 'ts';
define("src/ts/service/message-queue", ["require", "exports"], function (require, exports) {
    "use strict";
    var MessageQueue = (function () {
        function MessageQueue() {
            var _this = this;
            this._queue = [];
            this._active = false;
            ['_iterateSuccess', '_iterateFailure', 'push'].forEach(function (key) { _this[key] = _this[key].bind(_this); });
        }
        MessageQueue.prototype._iterateSuccess = function () {
            this._queue.shift();
            this._iterate();
        };
        MessageQueue.prototype._iterateFailure = function (e) {
            console.log("Error", e);
            this._iterate();
        };
        MessageQueue.prototype._iterate = function () {
            if (!this._queue.length) {
                this._active = false;
                return;
            }
            var out = this._queue[0];
            console.log("Dequeued", out['Action'], JSON.stringify(out));
            Pebble.sendAppMessage(out, this._iterateSuccess, this._iterateFailure);
        };
        MessageQueue.prototype.push = function (data) {
            //Add all
            if (!Array.isArray(data)) {
                this._queue.push(data);
            }
            else {
                this._queue = this._queue.concat(data);
            }
            console.log("Queued", data['Action'], JSON.stringify(data));
            if (!this._active) {
                this._active = true;
                this._iterate();
            }
        };
        MessageQueue.prototype.pusher = function (fn) {
            var _this = this;
            return function (data) {
                var arr = Array.isArray(data) ? data : [data];
                _this.push(arr.map(fn));
            };
        };
        MessageQueue.prototype.clear = function () {
            this._queue = [];
            this._active = false;
        };
        return MessageQueue;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = MessageQueue;
});
define("src/ts/service/options", ["require", "exports"], function (require, exports) {
    "use strict";
    var OptionService = (function () {
        function OptionService(url, ns) {
            var _this = this;
            this._data = {};
            this._ns = ns;
            this._url = url;
            Pebble.addEventListener('ready', function () { return _this.init(); });
        }
        OptionService.prototype.init = function () {
            var _this = this;
            var self = this;
            Pebble.addEventListener('showConfiguration', function (e) { return Pebble.openURL(_this._url); });
            Pebble.addEventListener('webviewclosed', function (e) { return _this.putAll(JSON.parse(decodeURIComponent(e.response || '{}'))); });
            return this.read();
        };
        OptionService.prototype.read = function () {
            this._data = JSON.parse(localStorage.getItem(this._ns + "_data") || '{}');
            return this._data;
        };
        OptionService.prototype.save = function () {
            localStorage.setItem(this._ns + "_data", JSON.stringify(this._data));
        };
        OptionService.prototype.get = function (key) {
            return this._data[key];
        };
        OptionService.prototype.set = function (key, val) {
            this._data[key] = val;
            this.save();
        };
        OptionService.prototype.getAll = function () {
            return this._data;
        };
        OptionService.prototype.putAll = function (obj) {
            for (var k in obj) {
                this._data[k] = obj[k];
            }
            this.save();
        };
        return OptionService;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = OptionService;
});
define("src/ts/util/deferred", ["require", "exports"], function (require, exports) {
    "use strict";
    var Deferred = (function () {
        function Deferred() {
            this._failure = [];
            this._success = [];
            this._resolved = undefined;
            this._rejected = undefined;
        }
        Deferred.prototype.promise = function () {
            var _this = this;
            return {
                then: function (succ, fail) {
                    if (succ) {
                        if (_this._resolved !== undefined) {
                            succ(_this._resolved);
                        }
                        else {
                            _this._success.push(succ);
                        }
                    }
                    if (fail) {
                        if (_this._rejected !== undefined) {
                            fail(_this._rejected);
                        }
                        else {
                            _this._failure.push(succ);
                        }
                    }
                }
            };
        };
        Deferred.prototype.resolve = function (data) {
            if (this._resolved === undefined && this._rejected === undefined) {
                this._resolved = data;
            }
            else {
                return;
            }
            this._success.forEach(function (fn) {
                fn(data);
            });
            return this;
        };
        Deferred.prototype.reject = function (err) {
            if (this._resolved === undefined && this._rejected === undefined) {
                this._rejected = err;
            }
            else {
                return;
            }
            this._failure.forEach(function (fn) { return fn(err); });
            return this;
        };
        return Deferred;
    }());
    exports.Deferred = Deferred;
});
define("src/ts/model/timer", ["require", "exports"], function (require, exports) {
    "use strict";
    var TimerModel = (function () {
        function TimerModel() {
        }
        return TimerModel;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = TimerModel;
});
define("src/ts/model/task", ["require", "exports"], function (require, exports) {
    "use strict";
    var ProjectTaskModel = (function () {
        function ProjectTaskModel() {
        }
        return ProjectTaskModel;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = ProjectTaskModel;
});
define("src/ts/model/project", ["require", "exports"], function (require, exports) {
    "use strict";
    var Project = (function () {
        function Project() {
        }
        return Project;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Project;
});
define("src/ts/model/project-task", ["require", "exports"], function (require, exports) {
    "use strict";
    var ProjectTaskModel = (function () {
        function ProjectTaskModel() {
        }
        return ProjectTaskModel;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = ProjectTaskModel;
});
define("src/ts/service/base", ["require", "exports", "src/ts/util/deferred"], function (require, exports, deferred_1) {
    "use strict";
    var BaseRest = (function () {
        function BaseRest() {
            this._memoizeCache = {};
        }
        BaseRest.prototype.exec = function (method, url, body) {
            var def = new deferred_1.Deferred();
            var req = new XMLHttpRequest();
            req.open(method, url);
            req.setRequestHeader('Accept', 'application/json');
            if (body) {
                req.setRequestHeader('Content-Type', 'application/json');
            }
            req.onload = function (e) {
                if (req.status >= 200 && req.status < 400) {
                    def.resolve(JSON.parse(req.response));
                }
                else {
                    def.reject("Request status is " + req.status);
                }
            };
            req.onerror = def.reject;
            body = body ? JSON.stringify(body) : null;
            req.send(body);
            return def.promise();
        };
        BaseRest.prototype.get = function (url) {
            return this.exec('GET', url);
        };
        BaseRest.prototype.post = function (url, data) {
            return this.exec('POST', url, data);
        };
        BaseRest.prototype.listToMap = function (promise, keyProp) {
            var def = new deferred_1.Deferred();
            promise.then(function (data) {
                var out = {};
                data.forEach(function (x) { return out[x[keyProp]] = x; });
                def.resolve(out);
            }, def.reject);
            return def.promise();
        };
        BaseRest.prototype.memoize = function (fn, name) {
            name = name || 'Key' + Math.random();
            var self = this;
            return function () {
                var args = Array.prototype.slice.call(arguments, 0);
                var key = [name].concat(args).join('||');
                if (key in self._memoizeCache) {
                    return new deferred_1.Deferred().resolve(self._memoizeCache[key]).promise();
                }
                return fn.apply(self, args)
                    .then(function (data) {
                    console.log("Caching", key, data);
                    self._memoizeCache[key] = data;
                });
            };
        };
        ;
        return BaseRest;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = BaseRest;
});
define("src/ts/service/harvest", ["require", "exports", "src/ts/util/deferred", "src/ts/model/timer", "src/ts/model/task", "src/ts/model/project", "src/ts/service/base"], function (require, exports, deferred_2, timer_1, task_1, project_1, base_1) {
    "use strict";
    var HarvestService = (function (_super) {
        __extends(HarvestService, _super);
        function HarvestService(options) {
            var _this = this;
            _super.call(this);
            this.options = options;
            //Memoize  
            ['getTasks', 'getTaskMap', 'getProjects', 'getProjectMap', 'getProjectTasks', 'getRecentProjectTaskMap']
                .forEach(function (fn) { _this[fn] = _this.memoize(_this[fn], fn); });
        }
        HarvestService.prototype.exec = function (method, path, body) {
            var url = "https://" + this.options.get('token.domain') + ".harvestapp.com" + path + "?access_token=" + this.options.get('oauth.access_token');
            return _super.prototype.exec.call(this, method, url, body);
        };
        HarvestService.prototype.getTimers = function () {
            var seen = {};
            var def = new deferred_2.Deferred();
            this.get('/daily').then(function (assignments) {
                var active = assignments.day_entries
                    .map(function (a) {
                    a.updated_at = Date.parse(a.updated_at);
                    if (!!a.timer_started_at) {
                        a.updated_at += 3600 * 60;
                    }
                    return a;
                })
                    .sort(function (a, b) { return b.updated_at - a.updated_at; })
                    .map(function (x) {
                    console.log(x.updated_at);
                    var key = x.project_id + "||" + x.task_id;
                    if (!seen[key]) {
                        seen[key] = true;
                        var out = new timer_1.default();
                        out.active = !!x.timer_started_at;
                        out.projectId = x.project_id;
                        out.projectTitle = x.project;
                        out.taskId = x.task_id;
                        out.taskTitle = x.task;
                        out.id = x.id;
                        return out;
                    }
                })
                    .filter(function (x) { return !!x; });
                def.resolve(active);
            }, def.reject);
            return def.promise();
        };
        HarvestService.prototype.getRecentProjectTaskMap = function () {
            var def = new deferred_2.Deferred();
            this.get('/daily').then(function (assignments) {
                var recent = {};
                function addProjectTask(projectid, taskid) {
                    if (!recent[projectid]) {
                        recent[projectid] = {};
                    }
                    recent[projectid][taskid] = true;
                }
                assignments.day_entries.forEach(function (x) { return addProjectTask(x.project_id, x.task_id); });
                assignments.projects.forEach(function (p) {
                    p.tasks.forEach(function (t) { return addProjectTask(p.id, t.id); });
                });
                def.resolve(recent);
            }, def.reject);
            return def.promise();
        };
        HarvestService.prototype.createTimer = function (projectId, taskId) {
            var data = {
                "project_id": projectId,
                "task_id": taskId
            };
            return this.post('/daily/add', data);
        };
        HarvestService.prototype.toggleTimer = function (entryId) {
            return this.post('/daily/timer/' + entryId);
        };
        HarvestService.prototype.getTasks = function () {
            var def = new deferred_2.Deferred();
            this.get('/tasks').then(function (tasks) {
                var models = tasks
                    .filter(function (x) { return !x.task.deactivated; })
                    .map(function (x) {
                    var out = new task_1.default();
                    out.id = x.task.id;
                    out.name = x.task.name;
                    out.is_default = x.task.is_default;
                    return out;
                });
                def.resolve(models);
            }, def.reject);
            return def.promise();
        };
        HarvestService.prototype.getTaskMap = function () {
            return this.listToMap(this.getTasks(), 'id');
        };
        HarvestService.prototype.getProjects = function () {
            var def = new deferred_2.Deferred();
            this.get('/projects').then(function (projects) {
                var models = projects
                    .filter(function (x) { return x.project.active && x.project.name; })
                    .map(function (x) {
                    var out = new project_1.default();
                    out.name = x.project.name;
                    out.id = x.project.id;
                    out.client_id = x.project.client_id;
                    return out;
                })
                    .sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
                def.resolve(models);
            }, def.reject);
            return def.promise();
        };
        HarvestService.prototype.getProjectMap = function () {
            this.getProjects().then(function (data) {
            });
            return this.listToMap(this.getProjects(), 'id');
        };
        HarvestService.prototype.getProjectTasks = function (projectId) {
            var _this = this;
            var def = new deferred_2.Deferred();
            this.getTaskMap().then(function (tasks) {
                _this.get('/projects/' + projectId + '/task_assignments').then(function (taskProjects) {
                    if (taskProjects && taskProjects.length) {
                        taskProjects
                            .map(function (x) { return tasks[x.task_assignment.task_id]; })
                            .filter(function (x) { return !!x; })
                            .sort(function (a, b) { return a.is_default ? -1 : a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
                    }
                    def.resolve(taskProjects);
                }, def.reject);
            }, def.reject);
            return def.promise();
        };
        return HarvestService;
    }(base_1.default));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = HarvestService;
});
define("src/ts/service/message-handler", ["require", "exports"], function (require, exports) {
    "use strict";
    var MessageHandler = (function () {
        function MessageHandler(key) {
            this._handlers = {};
            this._messageKey = null;
            this._messageKey = key;
            // Listen for when an AppMessage is received
            Pebble.addEventListener('appmessage', this.onMessage.bind(this));
        }
        MessageHandler.prototype.onMessage = function (e) {
            var data = e.payload;
            var key = data[this._messageKey];
            console.log(JSON.stringify(data));
            if (this._handlers[key]) {
                this._handlers[key](data, this.onError.bind(this));
            }
            else {
                this.onError("Unknown action:" + key);
            }
        };
        MessageHandler.prototype.onError = function (err) {
            console.log(err);
        };
        MessageHandler.prototype.register = function (key, fn) {
            if (typeof key === 'string') {
                this._handlers[key] = fn;
            }
            else {
                for (var k in key) {
                    this.register(k, key[k]);
                }
            }
        };
        return MessageHandler;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = MessageHandler;
});
define("src/ts/app", ["require", "exports", "src/ts/service/message-queue", "src/ts/service/options", "src/ts/service/harvest", "src/ts/service/message-handler"], function (require, exports, message_queue_1, options_1, harvest_1, message_handler_1) {
    "use strict";
    var queue = new message_queue_1.default();
    var options = new options_1.default('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
    var harvest = new harvest_1.default(options);
    var handler = new message_handler_1.default('Action');
    handler.onError = function (e) {
        console.log(e);
        queue.push({
            Action: "Error",
        });
    };
    handler.register({
        /*function fetchRecentAssignemnts(success, failure) {
          rest('GET', '/daily/' + utils.dayOfYear() + '/' + new Date().getFullYear(), function(assignments) {
            assignments.day_entries.map(function(x) {
              return {
                projectId : x.project_id,
                taskId : x.task_id
              };
            });
          }, failure);
        }*/
        'project-list': function (data, err) {
            harvest.getRecentProjectTaskMap()
                .then(function (recent) {
                harvest.getProjects().then(queue.pusher(function (p) {
                    return {
                        Action: 'project-added',
                        Project: p.id,
                        Active: recent[p.id] !== undefined,
                        Name: p.name
                    };
                }), err);
            }, err);
        },
        'timer-list': function (data, err) {
            harvest.getTimers().then(function (items) {
                items.forEach(function (t) {
                    queue.push([{
                            Action: "timer-add-begin",
                            Timer: t.id,
                            Project: t.projectId,
                            Task: t.taskId,
                            Active: t.active
                        }, {
                            Action: "timer-add-project-name",
                            Name: t.projectTitle
                        }, {
                            Action: "timer-add-task-name",
                            Name: t.taskTitle
                        }, {
                            Action: "timer-add-complete"
                        }]);
                });
            }, err);
        },
        'project-tasks': function (data, err) {
            harvest.getRecentProjectTaskMap().then(function (recent) {
                harvest.getProjectTasks(data.Project).then(queue.pusher(function (t) {
                    return {
                        Action: 'project-task-added',
                        Task: t.id,
                        Active: recent[data.Project][t.id] !== undefined,
                        Name: t.name
                    };
                }), err);
            }, err);
        },
        'timer-add': function (data, err) {
            harvest.createTimer(data.Project, data.Task).then(queue.pusher(function (timer) {
                return {
                    Action: 'timer-list-reload',
                    Timer: timer.id
                };
            }), err);
        },
        'timer-toggle': function (data, err) {
            harvest.toggleTimer(data.Timer).then(queue.pusher(function (timer) {
                return {
                    Action: 'timer-list-reload',
                    Timer: timer.id,
                    Active: !timer.ended_at && !!timer.timer_started_at
                };
            }), err);
        }
    });
    Pebble.addEventListener('ready', function (e) {
        options.set('access_token', 'f8NAb9sXnWJ7jiN9xaClMswBk9VmpZCnpzHDD8ETVj5AuFFlYDPkmdireKiDoZFxqcysOBAFu119bTPz67S');
        queue.push({
            Action: 'ready'
        });
    });
});
define("src/ts/util/utils", ["require", "exports"], function (require, exports) {
    "use strict";
    var Utils = (function () {
        function Utils() {
        }
        Utils.prototype.dayOfYear = function () {
            var now = new Date();
            var start = new Date(now.getFullYear(), 0, 0).getTime();
            var diff = now.getTime() - start;
            var oneDay = 1000 * 60 * 60 * 24;
            return parseInt('' + Math.floor(diff / oneDay));
        };
        return Utils;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Utils;
});
