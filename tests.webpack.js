function requireAll(context) {
  context.keys().forEach(context);
}

requireAll(require.context('./components/__tests__', true, /-test\.js$/));
requireAll(require.context('./core/__tests__', true, /-test\.js$/));
requireAll(require.context('./locations/__tests__', true, /-test\.js$/));
requireAll(require.context('./utils/__tests__', true, /-test\.js$/));
