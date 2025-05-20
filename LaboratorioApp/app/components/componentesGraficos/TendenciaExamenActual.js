import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Platform } from 'react-native';

const TendenciaExamenActual = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  
  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/TendenciaExamenActual`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Text style={styles.loadingText}>Cargando datos...</Text>;

  if (!data.tendenciaMensual || Object.keys(data.tendenciaMensual).length === 0) {
    return <Text style={styles.noDataText}>No hay datos de tendencia.</Text>;
  }

  const monthNames = Object.keys(data.tendenciaMensual);
  const monthValues = Object.values(data.tendenciaMensual);

  const screenWidth = Dimensions.get('window').width * 0.95;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tendencia Mensual de: {data.examen}</Text>
      <Text style={styles.subtitle}>Total anual: {data.totalAnual} exámenes</Text>
      
      <LineChart
        data={{
          labels: monthNames.map(name => name.substring(0, 3)),
          datasets: [{
            data: monthValues,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            strokeWidth: 2
          }]
        }}
        width={screenWidth}
        height={300}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#ffa726'
          }
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});

export default TendenciaExamenActual;