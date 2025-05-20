import React, { useEffect, useState } from 'react';
import { Platform, View, ScrollView, StyleSheet } from 'react-native'; // Asegúrate de importar ScrollView
import ClientesTable from '../components/ComponentsClientes/ClientesTable';

function ClienteScreen({route,navigation}) {
  const { userData } = route.params; // Accedemos al token pasado
   console.log(userData);
  return (
    <View style={styles.container}>
      <ClientesTable 
      route={{params:{userData}}}
      navigation={navigation}/>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});


export default ClienteScreen;
