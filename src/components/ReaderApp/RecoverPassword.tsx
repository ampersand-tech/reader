/**
 * Copyright 2014-present Ampersand Technologies, Inc.
 */

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate';
import * as IpcUtil from 'clientjs/ipcClientUtil';
import { FixedTemplateName } from 'clientjs/shared/fixedTemplates';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import { AccountSharedCommands } from 'overlib/shared/accountSharedCommands';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Props {
  email?: string;
}

interface State {
  template: FixedTemplateName;
  error: string;
  email: string;
  verifyLink: string|undefined; // used by integration test; never set in production
}

export class RecoverPassword extends DataWatcher<Props, State> {
  static propTypes = {
    email: PropTypes.string,
  };

  static defaultProps = {
    testid: 'RecoverPassword',
  };

  state: State = {
    template: 'RecoverPasswordEmail',
    error: '',
    email: '',
    verifyLink: undefined,
  };

  goToSignup = () => {
    Navigation.go(ReaderRoutes.signup);
  }

  goToLogin = () => {
    if (this.props.email) {
      Navigation.go(ReaderRoutes.login1(this.props.email));
    } else {
      Navigation.go(ReaderRoutes.login0);
    }
  }

  componentWillMount() {
    super.componentWillMount();
    this.setState({email: this.props.email || ''});
  }

  componentDidMount() {
    if (!IpcUtil.isReaderAccessAllowed()) {
      Navigation.go(['404'] as any, {noHistory: true});
    }
  }

  updateEmail = (email: string) => {
    this.setState({email});
  }

  acceptEmail = () => {
    if (!Util.emailMatch(this.state.email)) {
      this.setState({error: "That's not a valid email address"});
      return;
    }

    this.setState({template: 'SignupWorking'});

    AccountSharedCommands.account.forgotPassword.call(this, {email: this.state.email, bundle: 'reader'}, (err, verifyLink) => {
      if (Util.isNotFound(err)) {
        this.setState({template: 'RecoverPasswordEmail', error: `No account exists for ${this.state.email}`});
      } else if (err === 'offline') {
        this.setState({
          template: 'RecoverPasswordEmail',
          error: 'There was a problem contacting our servers.  Please check your Internet connection and try again.',
        });
      } else if (err) {
        Log.warn('@unassigned', 'accountForgotPassword failed', err);
      } else {
        this.setState({template: 'RecoverPasswordEmailSent', verifyLink});
      }
    });
  }

  render() {
    const context = (
      this.state.template === 'SignupWorking'
      ? {}
      : {
        error: this.state.error,
        email: (this.state.email || '').trim(),

        updateEmail: this.updateEmail,
        acceptEmail: this.acceptEmail,

        goToSignup: this.goToSignup,
        goToLogin: this.goToLogin,
      }
    );

    return <FixedTemplate
      template={this.state.template}
      context={context}
      />;
  }
}

const contextSchema = {
  error: Types.STRING,
  email: Types.STRING,

  updateEmail: Types.FUNCTION,
  acceptEmail: Types.FUNCTION,

  goToSignup: Types.FUNCTION,
  goToLogin: Types.FUNCTION,
};

const sampleContextSchema = {
  error: '',
  email: '',

  updateEmail: () => undefined,
  acceptEmail: () => undefined,

  goToSignup: () => undefined,
  goToLogin: () => undefined,
};

registerContextSchema(module, 'SignupWorking', {}, {});

for (const t of [
  'RecoverPasswordEmail',
  'RecoverPasswordEmailSent',
]) {
  registerContextSchema(module, t as any, contextSchema, sampleContextSchema);
}
