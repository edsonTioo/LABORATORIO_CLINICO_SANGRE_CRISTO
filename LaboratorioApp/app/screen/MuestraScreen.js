import React from 'react';
import { View, Text, StyleSheet } from 'react-native'; // <- Agrega StyleSheet aquí
import MuestrasTable from '../components/componentsMuestras/MuestrasTable';

function MuestraScreen({ route, navigation }) {
  const { userData } = route.params; // Accedemos al token pasado

  return (
    <View style={styles.container}>
      <MuestrasTable
        route={{ params: { userData } }}
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

export default MuestraScreen;
