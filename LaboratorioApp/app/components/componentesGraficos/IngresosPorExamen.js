import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const IngresosPorExamen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      // En web usamos el 95% del ancho, altura proporcional
      const newWidth = Platform.OS === 'web' ? width * 0.95 : width * 0.9;
      const newHeight = Platform.OS === 'web' ? Math.min(height * 0.5, 400) : 250;
      
      setChartDimensions({
        width: newWidth,
        height: newHeight
      });
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/IngresosPorExamen`);
        if (!response.ok) throw new Error("Error en la petición");
        const result = await response.json();
        setData(result.$values || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("No se pudieron cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (data.length === 0) return <NoDataView />;

  // Preparar datos para el gráfico
  const chartData = data.map((item, index) => ({
    name: `${item.examen.substring(0, 15)}${item.examen.length > 15 ? '...' : ''} (${item.totalIngresos.toLocaleString()})`,
    population: item.totalIngresos,
    color: getColor(index),
    legendFontColor: '#555',
    legendFontSize: Platform.OS === 'web' ? 14 : 12,
  }));

  function getColor(index) {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6F61', '#B39DDB', '#81C784'];
    return colors[index % colors.length];
  }

  const totalIngresos = data.reduce((sum, item) => sum + item.totalIngresos, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ingresos por Tipo de Examen (Top 10)</Text>
        <Text style={styles.subtitle}>Total ingresos: <Text style={styles.totalText}>${totalIngresos.toLocaleString()}</Text></Text>
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
          paddingLeft={Platform.OS === 'web' ? '0' : '15'}
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
    <ActivityIndicator size="large" color="#36A2EB" />
  </View>
);

const ErrorView = ({ message }) => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const NoDataView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.noDataText}>No hay datos de ingresos por examen.</Text>
  </View>
);

// Estilos optimizados para full width en web
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#555',
    textAlign: 'center',
  },
  totalText: {
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

export default IngresosPorExamen;