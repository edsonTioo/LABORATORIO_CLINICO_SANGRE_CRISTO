import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import OrdenesPendientesCard from './OrdenesPendientesCard';
import TotalClientesCard from './TotalClientesCard';
import TotalMedicosCard from './TotalMedicosCard';
import TotalGanadoAnualCard from './TotalGanadoAnualCard';
import { useWindowDimensions } from 'react-native';
export default function DashboardCardsRow() {
      const { width } = useWindowDimensions();
  const isMobile = width < 768;

    const cardStyle = [
    styles.card,
    isMobile && styles.mobileCard
  ];
  
  return (
    <View style={styles.container}>
      <View style={[styles.card, Platform.OS === 'android' && styles.androidCard]}>
        <OrdenesPendientesCard />
      </View>
      <View style={[styles.card, Platform.OS === 'android' && styles.androidCard]}>
        <TotalClientesCard />
      </View>
      <View style={[styles.card, Platform.OS === 'android' && styles.androidCard]}>
        <TotalMedicosCard />
      </View>
      <View style={[styles.card, Platform.OS === 'android' && styles.androidCard]}>
        <TotalGanadoAnualCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 10,
  },
  card: {
    width: '48%',         // Dos por fila en web
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  androidCard: {
    width: '100%',        // Una por fila en Android
  },
});