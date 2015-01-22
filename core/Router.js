var canUseDOM = require('react/lib/ExecutionEnvironment').canUseDOM;
var ImitateBrowserBehavior = require('../behaviors/ImitateBrowserBehavior');
var HashLocation = require('../locations/HashLocation');
var createRouterClass = require('./createRouterClass');
var Routing = require('./Routing');

/**
 * The default location for new routers.
 */
var DEFAULT_LOCATION = canUseDOM ? HashLocation : '/';

/**
 * The default scroll behavior for new routers.
 */
var DEFAULT_SCROLL_BEHAVIOR = canUseDOM ? ImitateBrowserBehavior : null;

function Router(options) {
  options = options || {};

  this.clearAllRoutes();

  this.scrollBehavior = options.scrollBehavior || DEFAULT_SCROLL_BEHAVIOR;

  if (options.routes)
    this.addRoutes(options.routes);
}

/**
 * Creates and returns a new Router.
 */
Router.create = function (options) {
  return new Router(options);
};

/**
 * A high-level convenience method that creates, configures, and
 * runs a router in one shot. The method signature is:
 *
 *   Router.run(routes[, location ], callback);
 *
 * Using `window.location.hash` to manage the URL, you could do:
 *
 *   Router.run(routes, function (Handler) {
 *     React.render(<Handler/>, document.body);
 *   });
 * 
 * Using HTML5 history and a custom "cursor" prop:
 * 
 *   Router.run(routes, Router.HistoryLocation, function (Handler) {
 *     React.render(<Handler cursor={cursor}/>, document.body);
 *   });
 *
 * Returns the newly created router.
 *
 * Note: If you need to specify further options for your router such
 * as error/abort handling or custom scroll behavior, use Router.create
 * instead.
 *
 *   var router = Router.create(options);
 *   router.run(function (Handler) {
 *     // ...
 *   });
 */
Router.run = function (routes, location, callback) {
  var router = new Router(routes);
  router.run(location, callback);
  return router;
};

assign(Router.prototype, Routing.Mixin, {

  /**
   * Creates and returns a new component class that uses this router
   * for matching paths on the given location. When the location changes,
   * the handler calls the callback.
   */
  run: function (location, callback) {
    if (typeof location === 'function') {
      callback = location;
      location = null;
    }

    location = location || DEFAULT_LOCATION;

    var Handler = createRouterClass(this, location, callback);

    if (Handler.isStatic) {
      Handler.dispatch(location);
    } else {
      Handler.start();
    }

    return Handler;
  },

  toString: function () {
    return '[object Router]';
  }

});

module.exports = Router;
