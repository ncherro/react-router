var ReactChildren = require('react').Children;
var assign = require('react/lib/Object.assign');
var warning = require('react/lib/warning');
var invariant = require('react/lib/invariant');
var DefaultRoute = require('../components/DefaultRoute');
var NotFoundRoute = require('../components/NotFoundRoute');
var Redirect = require('../components/Redirect');
var isReactChildren = require('../utils/isReactChildren');
var Path = require('../utils/Path');

function checkPropTypes(componentName, propTypes, props) {
  for (var propName in propTypes) {
    if (propTypes.hasOwnProperty(propName)) {
      var error = propTypes[propName](props, propName, componentName);

      if (error instanceof Error)
        warning(false, error.message);
    }
  }
}

function redirectTransitionTo(to, params, query) {
  return function (transition, _params, _query) {
    transition.redirect(to, params || _params, query || _query);
  };
}

function createRouteFromReactElement(element, parentRoute) {
  var type = element.type;
  var props = element.props;

  if (type.propTypes)
    checkPropTypes(type.displayName, type.propTypes, props);

  var options = {};

  if (props.ignoreScrollBehavior)
    options.ignoreScrollBehavior = true;

  if (type === Redirect.type) {
    options.willTransitionTo = redirectTransitionTo(props.to, props.params, props.query);

    // Setup a default path prop for <Redirect>s.
    props.path = props.path || props.from || '*';
  } else {
    options.handler = props.handler;
    options.willTransitionTo = props.handler.willTransitionTo;
    options.willTransitionFrom = props.handler.willTransitionFrom;
  }

  var parentPath = parentRoute.path || '/';

  if (props.path && type !== DefaultRoute.type && type !== NotFoundRoute.type) {
    var path = props.path;

    // Relative paths extend their parent.
    if (!Path.isAbsolute(path))
      path = Path.join(parentPath, path);

    options.path = Path.normalize(path);
  } else {
    options.path = parentPath;

    if (type === NotFoundRoute.type)
      options.path += '*';
  }

  options.paramNames = Path.extractParamNames(options.path);

  // Make sure the path has all params its parent needs.
  if (Array.isArray(parentRoute.paramNames)) {
    parentRoute.paramNames.forEach(function (paramName) {
      invariant(
        options.paramNames.indexOf(paramName) !== -1,
        'The nested route path "%s" is missing the "%s" parameter of its parent path "%s"',
        options.path, paramName, parentRoute.path
      );
    });
  }

  var route = new Route(options);

  // Make <DefaultRoute> a property of its parent.
  if (type === DefaultRoute.type) {
    invariant(
      parentRoute.defaultRoute == null,
      '%s may not have more than one <DefaultRoute>',
      parentRoute
    );

    parentRoute.defaultRoute = route;

    return null;
  }

  // Make <NotFoundRoute> a property of its parent.
  if (type === NotFoundRoute.type) {
    invariant(
      parentRoute.notFoundRoute == null,
      '%s may not have more than one <NotFoundRoute>',
      parentRoute
    );

    parentRoute.notFoundRoute = route;

    return null;
  }

  if (props.children)
    route.addRoutes(props.children);

  return route;
}

function createRoutesFromReactChildren(children, parentRoute) {
  var routes = [];

  var route;
  ReactChildren.forEach(children, function (element) {
    if (route = createRouteFromReactElement(element, parentRoute))
      routes.push(route);
  });

  return routes;
}

function createMatch(route, params, pathname, query) {
  return {
    routes: [ route ],
    params: params,
    pathname: pathname,
    query: query
  };
}

function findMatch(routes, defaultRoute, notFoundRoute, pathname, query) {
  var match, route, params;

  for (var i = 0, len = routes.length; i < len; ++i) {
    route = routes[i];

    // Check the subtree first to find the most deeply-nested match.
    match = findMatch(route.routes, route.defaultRoute, route.notFoundRoute, pathname, query);

    if (match != null) {
      match.routes.unshift(route);
      return match;
    }

    // No routes in the subtree matched, so check this route.
    params = Path.extractParams(route.path, pathname);

    if (params)
      return createMatch(route, params, pathname, query);
  }

  // No routes matched, so try the default route if there is one.
  if (defaultRoute && (params = Path.extractParams(defaultRoute.path, pathname)))
    return createMatch(defaultRoute, params, pathname, query);

  // Last attempt: does the "not found" route match?
  if (notFoundRoute && (params = Path.extractParams(notFoundRoute.path, pathname)))
    return createMatch(notFoundRoute, params, pathname, query);

  return match;
}

var Mixin = {

  clearAllRoutes: function () {
    this.defaultRoute = null;
    this.notFoundRoute = null;
    this.routes = [];
  },

  addRoutes: function (routes) {
    if (isReactChildren(routes))
      routes = createRoutesFromReactChildren(routes, this);

    this.routes.push.apply(this.routes, routes);
  },

  replaceRoutes: function (routes) {
    this.clearAllRoutes();
    this.addRoutes(routes);
  },

  /**
   * Tries to match on the given URL path, returning an object with
   * { routes, params, query } if successful, null otherwise.
   */
  match: function (path) {
    var split = path.split('?', 2);
    return findMatch(this.routes, this.defaultRoute, this.notFoundRoute, split[0], parseQuery(split[1]));
  },

  /**
   * Returns an absolute URL path created from the given path,
   * URL parameters, and query.
   */
  makePath: function (path, params, query) {
    if (Path.isAbsolute(path))
      path = Path.normalize(path);

    return Path.withQuery(Path.injectParams(path, params), query);
  }

};

function Route(options) {
  options = options || {};

  this.clearAllRoutes();

  this.path = options.path;
  this.paramNames = options.paramNames || Path.extractParams(this.path);
  this.ignoreScrollBehavior = options.ignoreScrollBehavior || false;
  this.willTransitionTo = options.willTransitionTo;
  this.willTransitionFrom = options.willTransitionFrom;
  this.handler = options.handler;

  if (options.routes)
    this.addRoutes(options.routes);
}

assign(Route.prototype, Mixin, {

  toString: function () {
    var string = '[object Route';

    if (this.path)
      string += ' path="' + this.path + '"';

    return string + ']';
  }

});

module.exports = {
  createRouteFromReactElement: createRouteFromReactElement,
  createRoutesFromReactChildren: createRoutesFromReactChildren,
  Mixin: Mixin,
  Route: Route
};
