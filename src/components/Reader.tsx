/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import 'clientjs/readerMetrics';
import 'clientjs/components/CanvasReader/ReaderContext';

import { LegalDocViewer } from 'clientjs/components/LegalDocViewer.tsx';
import * as ReaderNotifications from 'clientjs/readerNotifications';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import { getRouterProps } from 'clientjs/RouterProps';
import * as Application from 'clientjs/zero/Application.tsx';
import * as Navigation from 'overlib/client/navigation';
import * as Router from 'overlib/client/router';
import * as React from 'react';

function TestPage() {
  return <div/>;
}

function getSignedInRoutes(routerProps): Router.PathTable {
  const ReaderApp = require('clientjs/components/ReaderApp.tsx');

  const routes: Router.PathTable = Router.wrapRoutes([Application.DialogRedirects], ReaderApp.getRoutes(routerProps));

  if (Navigation.getQueryParameter('noLogoutRefresh')) {
    // logging out in a test; don't navigate to any actual page
    routes.push(
      [ReaderRoutes.login0, TestPage],
      [ReaderRoutes.login1, TestPage],
      [ReaderRoutes.Legacy.login0, TestPage],
      [ReaderRoutes.Legacy.login1, TestPage],
      [ReaderRoutes.signup, TestPage],
    );
  } else {
    routes.push(
      [ReaderRoutes.login0,        Router.redirect(ReaderRoutes.root)],
      [ReaderRoutes.login1,        Router.redirect(ReaderRoutes.root)],
      [ReaderRoutes.Legacy.login0, Router.redirect(ReaderRoutes.root)],
      [ReaderRoutes.Legacy.login1, Router.redirect(ReaderRoutes.root)],
      [ReaderRoutes.signup,        Router.redirect(ReaderRoutes.root)],
    );
  }

  routes.push(
    [Router.mkRoute(['loginReader']), Router.redirect(ReaderRoutes.login0)],
    [ReaderRoutes.Legacy.signup,      Router.redirect(ReaderRoutes.signup)],
  );

  return routes;
}

function buildRoutes() {
  const routes: Router.PathTable = [];
  const addRoutes = (more) => routes.push.apply(routes, more);

  const routerProps = getRouterProps();

  // add signed-in routes first, so they take precedence
  if (routerProps.isLoggedIn) {
    addRoutes(getSignedInRoutes(routerProps));
  }

  const ReaderOnboardApp = require('clientjs/components/ReaderOnboardApp.tsx');
  addRoutes(ReaderOnboardApp.getRoutes(routerProps));

  const rootRoute: [Router.AnyRoute, Router.Target] = routerProps.isLoggedIn
    ? [ReaderRoutes.root, Router.redirect(ReaderRoutes.readerRoot)]
    : [ReaderRoutes.root, Router.redirect(ReaderRoutes.signup)]
  ;

  routes.push(rootRoute);

  routes.push(
    [ReaderRoutes.legal0, LegalDocViewer],
    [ReaderRoutes.legal1, LegalDocViewer],
  );

  return Router.wrapRoutes([Application.App], routes);
}

export function run() {
  Application.run(ReaderRoutes.discover, buildRoutes, undefined, { ReaderNotifications });
}
