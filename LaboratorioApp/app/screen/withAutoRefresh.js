import React from 'react';
import { useFocusEffect } from '@react-navigation/native';

const withAutoRefresh = (WrappedComponent) => {
  return (props) => {
    const [refreshKey, setRefreshKey] = React.useState(0);

    useFocusEffect(
      React.useCallback(() => {
        setRefreshKey(prev => prev + 1);
        return () => {};
      }, [])
    );

    return <WrappedComponent key={refreshKey} {...props} />;
  };
};

export default withAutoRefresh;