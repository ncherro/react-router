var React = require('react');
var RouteHandling = require('../core/RouteHandling');

/**
 * A <RouteHandler> component renders the active child route handler
 * when routes are nested.
 */
var RouteHandler = React.createClass({

  displayName: 'RouteHandler',

  mixins: [ RouteHandling ],

  render: function () {
    return this.createChildRouteHandler();
  }

});

module.exports = RouteHandler;
