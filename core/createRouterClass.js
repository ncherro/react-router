var React = require('react');
var warning = require('react/lib/warning');
var invariant = require('react/lib/invariant');
var LocationActions = require('../actions/LocationActions');
var RouteHandler = require('../components/RouteHandler');
var RouteHandling = require('./RouteHandling');
var Cancellation = require('./Cancellation');
var Redirect = require('./Redirect');
var NavigationContext = require('./NavigationContext');
var StateContext = require('./StateContext');
var PropTypes = require('./PropTypes');
var Scrolling = require('./Scrolling');
var Transition = require('./Transition');

function hasProperties(object, properties) {
  for (var propertyName in properties)
    if (properties.hasOwnProperty(propertyName) && object[propertyName] !== properties[propertyName])
      return false;

  return true;
}

function hasMatch(routes, route, prevParams, nextParams, prevQuery, nextQuery) {
  return routes.some(function (r) {
    if (r !== route)
      return false;

    var paramNames = route.paramNames;
    var paramName;

    // Ensure that all params the route cares about did not change.
    for (var i = 0, len = paramNames.length; i < len; ++i) {
      paramName = paramNames[i];

      if (nextParams[paramName] !== prevParams[paramName])
        return false;
    }

    // Ensure the query hasn't changed.
    return hasProperties(prevQuery, nextQuery) && hasProperties(nextQuery, prevQuery);
  });
}

function createRouterClass(router, location, callback) {
  var state, nextState, pendingTransition;
  var mountedComponents = [];

  var Handler = React.createClass({

    displayName: 'Router',

    statics: {

      isStatic: typeof location === 'string',

      start: function () {
        if (location.addChangeListener)
          location.addChangeListener(this.handleLocationChange);

        this.refresh();
      },

      refresh: function () {
        this.dispatch(location.getCurrentPath(), null);
      },

      stop: function () {
        if (location.removeChangeListener)
          location.removeChangeListener(this.handleLocationChange);
      },

      handleLocationChange: function (change) {
        this.dispatch(change.path, change.type);
      },

      handleError: function (error) {
        // Throw so we don't silently swallow async errors.
        throw error; // This error probably originated in a transition hook.
      },

      handleAbort: function (abortReason) {
        if (this.isStatic)
          throw new Error('Unhandled aborted transition! Reason: ' + abortReason);

        if (abortReason instanceof Cancellation) {
          return;
        } else if (abortReason instanceof Redirect) {
          location.replace(
            router.makePath(abortReason.to, abortReason.params, abortReason.query)
          );
        } else {
          location.pop();
        }
      },

      handleTransition: function (error, transition, computedState) {
        if (error)
          this.handleError(error);

        if (pendingTransition !== transition)
          return;

        pendingTransition = null;

        if (transition.abortReason) {
          this.handleAbort(transition.abortReason);
        } else {
          callback.call(this, this, nextState = computedState);
        }
      },

      cancelPendingTransition: function () {
        if (pendingTransition) {
          pendingTransition.abort();
          pendingTransition = null;
        }
      },

      dispatch: function (path, action) {
        this.cancelPendingTransition();

        var prevPath = state.path;
        var isRefreshing = action == null;

        if (prevPath === path && !isRefreshing)
          return; // Nothing to do!

        // Record the scroll position as early as possible to
        // get it before browsers try update it automatically.
        if (prevPath && action !== LocationActions.REPLACE)
          this.recordScrollPosition(prevPath);

        var match = router.match(path);

        warning(
          match != null,
          'No route matches path "%s". Make sure you have <Route path="%s"> somewhere in your routes',
          path, path
        );

        if (match == null)
          match = {};

        var prevRoutes = state.routes || [];
        var prevParams = state.params || {};
        var prevQuery = state.query || {};

        var nextRoutes = match.routes || [];
        var nextParams = match.params || {};
        var nextQuery = match.query || {};

        var fromRoutes, toRoutes;
        if (prevRoutes.length) {
          fromRoutes = prevRoutes.filter(function (route) {
            return !hasMatch(nextRoutes, route, prevParams, nextParams, prevQuery, nextQuery);
          });

          toRoutes = nextRoutes.filter(function (route) {
            return !hasMatch(prevRoutes, route, prevParams, nextParams, prevQuery, nextQuery);
          });
        } else {
          fromRoutes = [];
          toRoutes = nextRoutes;
        }

        var transition = new Transition(path, this.replaceWith.bind(this, path));
        pendingTransition = transition;

        var fromComponents = mountedComponents.slice(prevRoutes.length - fromRoutes.length);
        var handleTransition = this.handleTransition;

        transition.from(fromRoutes, fromComponents, function (error) {
          if (error || transition.abortReason)
            return handleTransition(error, transition); // No need to continue.

          transition.to(toRoutes, nextParams, nextQuery, function (error) {
            handleTransition(error, transition, {
              path: path,
              action: action,
              pathname: match.pathname,
              routes: nextRoutes,
              params: nextParams,
              query: nextQuery
            });
          });
        });
      }

    },

    mixins: [ NavigationContext, StateContext, Scrolling, RouteHandling ],

    propTypes: {
      children: PropTypes.falsy
    },

    getInitialState: function () {
      return (state = nextState);
    },

    componentWillReceiveProps: function () {
      this.setState(state = nextState);
    },

    componentWillUnmount: function () {
      Handler.stop();
    },

    childContextTypes: {
      getRouteAtDepth: React.PropTypes.func.isRequired,
      setRouteComponentAtDepth: React.PropTypes.func.isRequired,
      routeHandlers: React.PropTypes.array.isRequired
    },

    getChildContext: function () {
      return {
        getRouteAtDepth: this.getRouteAtDepth,
        setRouteComponentAtDepth: this.setRouteComponentAtDepth,
        routeHandlers: [ this ]
      };
    },

    getLocation: function () {
      return location;
    },

    getScrollBehavior: function () {
      return router.scrollBehavior;
    },

    getRouteAtDepth: function (depth) {
      var routes = this.state.routes;
      return routes && routes[depth];
    },

    setRouteComponentAtDepth: function (depth, component) {
      mountedComponents[depth] = component;
    },

    render: function () {
      return this.createChildRouteHandler();
    }

  });

  return Handler;
}

module.exports = createRouterClass;
