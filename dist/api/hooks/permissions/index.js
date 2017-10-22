"use strict";

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var permissionPolicies = ['passport', 'sessionAuth', 'ModelPolicy', 'OwnerPolicy', 'PermissionPolicy', 'RolePolicy'];

var path = require('path');
var _ = require('lodash');
var Marlinspike = require("marlinspike");

var Permissions = (function (_Marlinspike) {
    _inherits(Permissions, _Marlinspike);

    function Permissions(sails) {
        _classCallCheck(this, Permissions);

        _get(Object.getPrototypeOf(Permissions.prototype), 'constructor', this).call(this, sails, module);
    }

    _createClass(Permissions, [{
        key: 'configure',
        value: function configure() {
            if (!_.isObject(sails.config.permissions)) {
                sails.config.permissions = {};
            }

            /**
             * Local cache of Model name -> id mappings to avoid excessive database lookups.
             */
            this.sails.config.blueprints.populate = false;
        }
    }, {
        key: 'initialize',
        value: function initialize(next) {
            var _this = this;

            var config = this.sails.config.permissions;

            this.installModelOwnership();
            this.sails.after(config.afterEvent, function () {
                if (!_this.validateDependencies()) {
                    _this.sails.log.error('Cannot find sails-auth hook. Did you "npm install sails-auth --save"?');
                    _this.sails.log.error('Please see README for installation instructions: https://github.com/tjwebb/sails-permissions');
                    return _this.sails.lower();
                }

                if (!_this.validatePolicyConfig()) {
                    _this.sails.log.warn('One or more required policies are missing.');
                    _this.sails.log.warn('Please see README for installation instructions: https://github.com/tjwebb/sails-permissions');
                }
            });

            this.sails.after('hook:orm:loaded', function () {
                sails.models.model.count().then(function (count) {
                    if (count === _.keys(_this.sails.models).length) {
                        return next();
                    }

                    return _this.initializeFixtures().then(function () {
                        next();
                    });
                })['catch'](function (error) {
                    _this.sails.log.error(error);
                    next(error);
                });
            });
        }
    }, {
        key: 'validatePolicyConfig',
        value: function validatePolicyConfig() {
            var policies = this.sails.config.policies;
            return _.all([_.isArray(policies['*']), _.intersection(permissionPolicies, policies['*']).length === permissionPolicies.length, policies.AuthController && _.includes(policies.AuthController['*'], 'passport')]);
        }
    }, {
        key: 'installModelOwnership',
        value: function installModelOwnership() {
            // sails.log.silly(`installModelOwnership() ${JSON.stringify(this.sails.models)} ${JSON.stringify(this.sails.config.models)}`);

            var models = this.sails.models;
            if (this.sails.config.models.autoCreatedBy === false) {
                sails.log.silly('installModelOwnership() (ABORT) (this.sails.config.models.autoCreatedBy === false)');
                return;
            }

            _.each(models, function (model) {
                if (model.autoCreatedBy === false) {
                    sails.log.silly('installModelOwnership() (ABORT) (model.autoCreatedBy === false)');
                    return;
                }

                _.defaults(model.attributes, {
                    createdBy: {
                        model: 'User',
                        index: true
                    },
                    owner: {
                        model: 'User',
                        index: true
                    }
                });

                // sails.log.silly(`installModelOwnership() (attach) ${JSON.stringify(model.attributes)}`);
            });
        }

        /**
         * Install the application. Sets up default Roles, Users, Models, and
         * Permissions, and creates an admin user.
         */
    }, {
        key: 'initializeFixtures',
        value: function initializeFixtures() {
            var _this2 = this;

            var fixturesPath = path.resolve(__dirname, '../../../config/fixtures/');
            return require(path.resolve(fixturesPath, 'model')).createModels().then(function (models) {
                _this2.models = models;
                _this2.sails.hooks.permissions._modelCache = _.keyBy(models, 'identity');

                return require(path.resolve(fixturesPath, 'role')).create();
            }).then(function (roles) {
                _this2.roles = roles;
                var userModel = _.find(_this2.models, { name: 'User' });
                return require(path.resolve(fixturesPath, 'user')).create(_this2.roles, userModel);
            }).then(function () {
                if (sails.config.permissions.autoCreateAdmin) {
                    return Promise.resolve().then(function () {
                        return sails.models.user.findOne({ email: _this2.sails.config.permissions.adminEmail });
                    }).then(function (user) {
                        _this2.sails.log('sails-permissions: created admin user:', user);
                        user.createdBy = user.id;
                        user.owner = user.id;
                        return user.save();
                    });
                } else {
                    return null;
                }
            }).then(function (admin) {
                return require(path.resolve(fixturesPath, 'permission')).create(_this2.roles, _this2.models, admin, _this2.sails.config.permissions);
            })['catch'](function (error) {
                _this2.sails.log.error(error);
            });
        }
    }, {
        key: 'validateDependencies',
        value: function validateDependencies() {
            return !!this.sails.hooks.auth;
        }
    }]);

    return Permissions;
})(Marlinspike);

exports['default'] = Marlinspike.createSailsHook(Permissions);
module.exports = exports['default'];
//# sourceMappingURL=index.js.map
