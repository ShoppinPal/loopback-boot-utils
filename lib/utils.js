'use strict';

/**
 *  To use this module you must set the bluebird library
 *  as the default promise library in your `server.js`:
 *   > global.Promise = require('bluebird');
 */

var commentsIndex = 0;
var debug = require('debug')('boot:loopback-boot-utils');

// required dependencies - will be injected
var app;
var Role;
var RoleMapping;
var UserModel;
var Promise;

// module initialization code
module.exports = function(dependencies){
  app = dependencies.app;
  Role = dependencies.Role;
  RoleMapping = dependencies.RoleMapping;
  UserModel = dependencies.UserModel;
  Promise = dependencies.Promise || require('bluebird');

  return {
    findOrCreateRoleToAssignUser: findOrCreateRoleToAssignUser,
    findOrCreateRelatedModel: findOrCreateRelatedModel,
    setupUser: setupUser
  };
};

/**
 * NOTE: principal refers to RoleMapping
 *
 * @param aUserModel
 * @returns {*} a promise wrapped array ( [Role, RoleMapping] ) which can be can be spread() as needed
 */
var findOrCreateRoleToAssignUser = function(aUserModel){
  debug('(' + (++commentsIndex) + ') ' + 'inside findOrCreateRoleToAssignUser');
  return Role.findOrCreate(
    {where: {name: aUserModel.seedWithRole||'retailer'}}, // find
    {name: aUserModel.seedWithRole||'retailer'} // or create
  )
    .spread(function(role, created) {
      (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'Role', role)
        : debug('(' + (++commentsIndex) + ') ' + 'found', 'Role', role);

      debug('(' + (++commentsIndex) + ') ' + 'will assign roles');
      return findOrCreateRelatedModel(
        role.principals,
        {where: {principalType: RoleMapping.USER, principalId: aUserModel.id}}, // find
        {principalType: RoleMapping.USER, principalId: aUserModel.id} // or create
      )
        .spread(function(principal, created) {
          (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'RoleMapping', principal)
            : debug('(' + (++commentsIndex) + ') ' + 'found', 'RoleMapping', principal);
          debug('(' + (++commentsIndex) + ') ' + aUserModel.username + ' now has role: ' + role.name);
          return Promise.resolve([role, principal]); // can spread() it as needed
        });
    });
};

var findOrCreateRelatedModel = function (relatedModel, findUsing, createUsing){
  var RelatedModel = app.models[relatedModel._targetClass];

  return RelatedModel.findOne(findUsing)
    .then(function(modelInstance){
      debug('inside findOrCreateRelatedModel', 'modelInstance', modelInstance);
      if(modelInstance) {
        //debug('inside findOrCreateRelatedModel', 'return as found');
        var created = false;
        return Promise.resolve([modelInstance, created]);
      }
      else {
        debug('inside findOrCreateRelatedModel', 'return as created');
        return relatedModel.create(createUsing)
          .then(function(modelInstance){
            var created = true;
            return Promise.resolve([modelInstance, created]);
          });
      }
    });
};

var setupUser = function(rawUser) {
  return UserModel.findOrCreate(
    {where: {username: rawUser.username}}, // find
    rawUser // or create
  )
    .spread(function(userInstance, created) {
      (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'UserModel', userInstance)
        : debug('('+ (++commentsIndex) +') ' + 'found', 'UserModel', userInstance);

      return findOrCreateRoleToAssignUser(userInstance)
        .spread(function(/*role, principal*/){
          return Promise.resolve(userInstance);
        });
    });
};