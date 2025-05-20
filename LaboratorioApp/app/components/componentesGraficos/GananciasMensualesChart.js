import React, { useEffect, useState } from 'react';
import { View, Text, Platform, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ScrollView } from 'react-native';
const GananciasMensualesChart = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width);

  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  // Configuración responsive para full width en web
  useEffect(() => {
    const updateDimensions = () => {
      const { width } = Dimensions.get('window');
      // En web usamos 98% del ancho, en móvil 95% del ancho
      const newWidth = Platform.OS === 'web' ? 
        width * 0.98 : 
        width * 0.95;
      setChartWidth(newWidth);
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/GananciasMensuales`);
        if (!response.ok) throw new Error("Error en la petición");
        const result = await response.json();
        
        const filteredData = Object.fromEntries(
          Object.entries(result).filter(([key]) => key !== '$id')
        );
        
        setData(filteredData);
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
  if (Object.keys(data).length === 0 || Object.values(data).every(val => val === 0)) {
    return <NoDataView />;
  }

  // Configurar datos del gráfico
  const meses = Object.keys(data).map(month => month.substring(0, 3).toUpperCase());
  const valores = Object.values(data);
  const chartHeight = Platform.OS === 'web' ? 450 : 300;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ganancias Mensuales</Text>
      
      {Platform.OS === 'web' ? (
        // Versión WEB - Full Width
        <View style={styles.webChartContainer}>
          <BarChart
            data={{
              labels: meses,
              datasets: [{
                data: valores,
                colors: valores.map((_, index) => (opacity = 1) => {
                  const colors = [
                    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#8AC249', '#EA5F89', '#00BFFF', '#FFD700',
                    '#32CD32', '#BA55D3'
                  ];
                  return colors[index % colors.length];
                })
              }]
            }}
            width={chartWidth}
            height={chartHeight}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
            chartConfig={webChartConfig}
            style={styles.chart}
            verticalLabelRotation={45}
            withCustomBarColorFromData
            flatColor
            showBarTops={false}
            withHorizontalLabels={true}
          />
        </View>
      ) : (
        // Versión MÓVIL con scroll horizontal si es necesario
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContent}
        >
          <BarChart
            data={{
              labels: meses,
              datasets: [{
                data: valores,
                colors: valores.map((_, index) => (opacity = 1) => {
                  const colors = [
                    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#8AC249', '#EA5F89', '#00BFFF', '#FFD700',
                    '#32CD32', '#BA55D3'
                  ];
                  return colors[index % colors.length];
                })
              }]
            }}
            width={Math.max(chartWidth, meses.length * 60)} // Asegurar ancho mínimo
            height={chartHeight}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
            chartConfig={mobileChartConfig}
            style={styles.chart}
            verticalLabelRotation={45}
            withCustomBarColorFromData
            flatColor
            showBarTops={false}
          />
        </ScrollView>
      )}
    </View>
  );
};

// Componentes auxiliares
const LoadingView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <ActivityIndicator size="large" color="#3F51B5" />
  </View>
);

const ErrorView = ({ message }) => (
  <View style={[styles.container, styles.errorContainer]}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const NoDataView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.noDataText}>No hay ganancias registradas este año.</Text>
  </View>
);

// Configuraciones separadas para web y móvil
const webChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  fillShadowGradient: '#2575fc',
  fillShadowGradientOpacity: 1,
  barPercentage: 0.8, // Barras más anchas en web
  propsForLabels: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  propsForVerticalLabels: {
    rotation: -45,
    dy: 20,
    dx: -10,
    fontSize: 12
  }
};

const mobileChartConfig = {
  ...webChartConfig,
  barPercentage: 0.6,
  propsForLabels: {
    fontSize: 12,
    fontWeight: 'bold'
  }
};

// Estilos optimizados para full width en web
const styles = StyleSheet.create({
  container: {
    marginTop: 25,
    backgroundColor: 'white',
    borderRadius: Platform.OS === 'web' ? 0 : 16,
    padding: 16,
    margin: Platform.OS === 'web' ? 0 : 8,
    shadowColor: Platform.OS === 'web' ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 0 : 6,
    elevation: Platform.OS === 'web' ? 0 : 3,
    width: Platform.OS === 'web' ? '100%' : 'auto',
    alignSelf: 'stretch'
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  webChartContainer: {
    width: '100%',
    overflow: 'hidden',
    marginVertical: 16
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    ...(Platform.OS === 'web' && { 
      width: '100%',
      alignSelf: 'center'
    })
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#c62828',
    fontSize: 16
  },
  noDataText: {
    color: '#666',
    fontSize: 16
  },
  mobileScrollContent: {
    paddingRight: 16
  }
});

export default GananciasMensualesChart;