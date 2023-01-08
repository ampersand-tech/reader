/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as Metrics from 'clientjs/metrics';

function getSignupDims() {
  return {
  };
}

Metrics.registerMetricGroup({
  READER: {
    SIGNUP: {
      getDims: getSignupDims,
    },
  },
});
