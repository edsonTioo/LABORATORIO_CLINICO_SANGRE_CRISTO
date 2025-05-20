import React, { useEffect, useState } from 'react';
import { Platform, View, ScrollView, StyleSheet } from 'react-native'; // Asegúrate de importar ScrollView
import TipoExamenTable from '../components/componenteTipoExamen/TipoExamenTable';
function TipoExamenScreen({route, navigation }) {
  const { userData } = route.params; // Accedemos al token pasado

  return (
  <View style={styles.container}>
    <TipoExamenTable
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

export default TipoExamenScreen;
