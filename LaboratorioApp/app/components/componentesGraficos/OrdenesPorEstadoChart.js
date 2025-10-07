import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from "@react-native-async-storage/async-storage";


const OrdenesPorEstadoChart = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const [chartDimensions, setChartDimensions] = useState({
    width: Dimensions.get('window').width,
    height: 300
  });

  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  // Configuración responsive para full width en web
  useEffect(() => {
    const updateDimensions = () => {
      const { width, height } = Dimensions.get('window');
      // En web usamos el 98% del ancho, altura proporcional
      const newWidth = Platform.OS === 'web' ? width * 0.98 : width * 0.95;
      const newHeight = Platform.OS === 'web' ? Math.min(height * 0.6, 500) : 250;
      
      setChartDimensions({
        width: newWidth,
        height: newHeight
      });
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  // Colores mejorados para los estados
  const estadoColors = {
    'COMPLETADO': '#4BC0C0',
    'FACTURADO': '#36A2EB',
    'PENDIENTE': '#FFCE56',
    'CANCELADO': '#FF6B6B',
    'EN PROCESO': '#9966FF',
    'APROBADO': '#66BB6A',
    'RECHAZADO': '#EF5350'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("No se encontró token, inicia sesión nuevamente");
    
        const response = await fetch(`${baseURL}/api/Graficos/OrdenesPorEstado`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // <-- aquí agregamos el token
          }
        });
    
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Error ${response.status}: ${text}`);
        }
    
        const result = await response.json();
    
        const filteredData = Object.fromEntries(
          Object.entries(result).filter(([key]) => key !== '$id')
        );
    
        const total = Object.values(filteredData).reduce((sum, value) => sum + value, 0);
    
        setData(filteredData);
        setTotalOrdenes(total);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message || "No se pudieron cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (Object.keys(data).length === 0) return <NoDataView />;

  // Preparar datos para el gráfico
  const chartData = Object.keys(data)
    .filter(key => data[key] > 0)
    .map((key) => ({
      name: `${key} (${data[key]})`,
      population: data[key],
      color: estadoColors[key] || '#CCCCCC',
      legendFontColor: '#5A5A5A',
      legendFontSize: Platform.OS === 'web' ? 14 : 12
    }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Distribución de Órdenes por Estado</Text>
        <Text style={styles.subtitle}>
          Total de órdenes: <Text style={styles.totalNumber}>{totalOrdenes}</Text>
        </Text>
      </View>
      
      <View style={styles.chartWrapper}>
        <PieChart
          data={chartData}
          width={chartDimensions.width}
          height={chartDimensions.height}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
          style={styles.chart}
          hasLegend={true}
          avoidFalseZero
          center={Platform.OS === 'web' ? [chartDimensions.width * 0.25, 0] : [0, 0]}
          labelRadius={Platform.OS === 'web' ? 0.8 : 0.6}
          labelsPosition={Platform.OS === 'web' ? 'outside' : 'default'}
        />
      </View>
    </View>
  );
};

// Componentes auxiliares
const LoadingView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <ActivityIndicator size="large" color="#4BC0C0" />
  </View>
);

const ErrorView = ({ message }) => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const NoDataView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.noDataText}>No hay órdenes registradas.</Text>
  </View>
);

// Estilos optimizados para full width en web
const styles = StyleSheet.create({
  container: {
    marginTop: 23,
    backgroundColor: 'white',
    borderRadius: Platform.OS === 'web' ? 0 : 16,
    padding: Platform.OS === 'web' ? 24 : 16,
    margin: Platform.OS === 'web' ? 0 : 8,
    shadowColor: Platform.OS === 'web' ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 0 : 8,
    elevation: Platform.OS === 'web' ? 0 : 5,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 18 : 14,
    color: '#666',
    textAlign: 'center',
  },
  totalNumber: {
    fontWeight: 'bold',
    color: '#36A2EB',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Platform.OS === 'web' ? 20 : 10,
  },
  chart: {
    borderRadius: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  errorText: {
    color: '#EF5350',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default OrdenesPorEstadoChart;