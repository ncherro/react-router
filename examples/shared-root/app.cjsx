React = require('react')
Router = require('react-router')
{ Route, RouteHandler, Link } = Router

App = React.createClass({
  render: ->
    <div>
      <ol>
        <li><Link to="home">Home</Link></li>
        <li><Link to="signin">Sign in</Link></li>
        <li><Link to="forgot-password">Forgot Password</Link></li>
      </ol>
      <RouteHandler/>
    </div>
})

SignedIn = React.createClass({
  render: ->
    <div>
      <h2>Signed In</h2>
      <RouteHandler/>
    </div>
})

Home = React.createClass({
  render: ->
    <h3>Welcome home!</h3>
})

SignedOut = React.createClass({
  render: ->
    <div>
      <h2>Signed Out</h2>
      <RouteHandler/>
    </div>
})

SignIn = React.createClass({
  render: ->
    <h3>Please sign in.</h3>
})

ForgotPassword = React.createClass({
  render: ->
    <h3>Forgot your password?</h3>
})

routes = (
  <Route handler={App}>
    <Route handler={SignedOut}>
      <Route name="signin" handler={SignIn}/>
      <Route name="forgot-password" handler={ForgotPassword}/>
    </Route>
    <Route handler={SignedIn}>
      <Route name="home" handler={Home}/>
    </Route>
  </Route>
)

Router.run(routes, (Handler) ->
  React.render(<Handler/>, document.getElementById('example'))
)
