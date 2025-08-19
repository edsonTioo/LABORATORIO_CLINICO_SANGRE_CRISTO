import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Platform } from 'react-native';

const ExamenesRecientes = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  
  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/ExamenesRecientes`);
        const result = await response.json();
        setData(result.$values || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Text style={styles.loadingText}>Cargando datos...</Text>;

  if (!data.detalles || data.detalles.length === 0) {
    return <Text style={styles.noDataText}>No hay datos de exámenes recientes.</Text>;
  }

  const screenWidth = Dimensions.get('window').width * 0.9;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exámenes Recientes</Text>
      <Text style={styles.subtitle}>{data.periodo}</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: data.detalles.map(item => item.examen.substring(0, 12)),
            datasets: [{
              data: data.detalles.map(item => item.cantidad)
            }]
          }}
          width={Math.max(screenWidth, data.detalles.length * 50)}
          height={300}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#2196F3',
            backgroundGradientTo: '#1976D2',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: 0.5
          }}
          style={styles.chart}
          verticalLabelRotation={45}
        />
      </ScrollView>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total exámenes: {data.totalExamenes}</Text>
      </View>
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
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  summary: {
    marginTop: 15,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
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

export default ExamenesRecientes;