import React, { useEffect, useState } from 'react';
import { Platform, View, ScrollView, StyleSheet } from 'react-native';
import TablaParametros from '../components/componentsParametros/TablaParametros';
function ParametroScreen({route, navigation }) {
  const { userData } = route.params; // Accedemos al token pasado
  return (
    <View style={styles.container}>
      <TablaParametros
        route={{params:{userData}}}
        navigation={navigation}/>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
});
export default ParametroScreen;
