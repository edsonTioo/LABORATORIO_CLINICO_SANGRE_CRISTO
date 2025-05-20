import React, { useEffect, useState } from 'react';
import { Platform, View, ScrollView, StyleSheet } from 'react-native'; // Asegúrate de importar ScrollView
import MedicoTabla from '../components/ComponentsMedico/MedicoTable';
function UserScreen({route,navigation}) {
  const {userData} = route.params;
  return (
    <View style={styles.container}>
      <MedicoTabla
      route={{params:{userData}}}
      navigation={navigation}
      />
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

export default UserScreen;
