import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';

const TotalGanadoAnualCard = () => {
  const [totalGanado, setTotalGanado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const baseURL = Platform.OS === 'android' 
          ? 'http://10.0.2.2:5090' 
          : 'http://localhost:5090';
        
        const response = await fetch(`${baseURL}/api/Graficos/Anual/${currentYear}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Sumar todos los meses para obtener el total anual
        let total = 0;
        for (const month in data) {
          if (month !== '$id' && typeof data[month] === 'number') {
            total += data[month];
          }
        }
        
        setTotalGanado(total);
      } catch (err) {
        console.error("Error al obtener total ganado:", err);
        setError("No se pudo cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <MaterialIcons name="error" size={24} color="#fff" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
    >
      <View style={[styles.iconContainer, {backgroundColor: '#FFA000'}]}>
        <MaterialIcons name="attach-money" size={28} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Total Ganado {new Date().getFullYear()}</Text>
        <Text style={styles.counter}>${totalGanado.toLocaleString()}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#888" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  counter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingCard: {
    backgroundColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
  },
  errorCard: {
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    marginLeft: 10,
  },
});

export default TotalGanadoAnualCard;