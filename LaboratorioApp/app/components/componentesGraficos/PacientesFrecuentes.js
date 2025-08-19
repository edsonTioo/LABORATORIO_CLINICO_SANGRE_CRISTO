import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const PacientesFrecuentes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartDimensions, setChartDimensions] = useState({
    width: Dimensions.get('window').width,
    height: 350
  });
  
  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  // Configuración responsive para full width en web
  useEffect(() => {
    const updateDimensions = () => {
      const { width, height } = Dimensions.get('window');
      // En web usamos el 98% del ancho, altura proporcional
      const newWidth = Platform.OS === 'web' ? width * 0.98 : width * 0.9;
      const newHeight = Platform.OS === 'web' ? Math.min(height * 0.5, 400) : 300;
      
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
        const response = await fetch(`${baseURL}/api/Graficos/PacientesFrecuentes`);
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

  if (loading) return <LoadingView />;
  if (data.length === 0) return <NoDataView />;

  // Colores personalizados para cada barra
  const getBarColor = (index) => {
    const colors = [
      '#4CAF50', '#2E7D32', '#388E3C', '#66BB6A', '#81C784',
      '#43A047', '#1B5E20', '#A5D6A7', '#C8E6C9', '#E8F5E9'
    ];
    return colors[index % colors.length];
  };

  // Configuración del gráfico
  const barPercentage = Platform.OS === 'web' ? 0.7 : 0.5;
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#f5f5f5',
    backgroundGradientTo: '#f5f5f5',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    barPercentage: barPercentage,
    propsForLabels: {
      fontSize: Platform.OS === 'web' ? 12 : 10,
      rotation: -45,
      dx: -10,
      dy: Platform.OS === 'web' ? 25 : 20
    },
    propsForBackgroundLines: {
      strokeWidth: 0.5,
      strokeDasharray: "0"
    },
    fillShadowGradientOpacity: 1
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top 10 Pacientes Frecuentes</Text>
      
      {Platform.OS === 'web' ? (
        // Versión WEB - Full Width
        <View style={styles.chartWrapper}>
          <BarChart
            data={{
              labels: data.map(item => item.nombreCliente),
              datasets: [{
                data: data.map(item => item.ordenesCount),
                colors: data.map((_, index) => (opacity = 1) => getBarColor(index))
              }]
            }}
            width={chartDimensions.width}
            height={chartDimensions.height}
            yAxisLabel=""
            yAxisSuffix=" órdenes"
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            withCustomBarColorFromData
            showBarTops={false}
            verticalLabelRotation={Platform.OS === 'web' ? 45 : 30}
          />
        </View>
      ) : (
        // Versión MÓVIL
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{
              labels: data.map(item => item.nombreCliente),
              datasets: [{
                data: data.map(item => item.ordenesCount),
                colors: data.map((_, index) => (opacity = 1) => getBarColor(index))
              }]
            }}
            width={Math.max(chartDimensions.width, data.length * 70)}
            height={chartDimensions.height}
            yAxisLabel=""
            yAxisSuffix=" órdenes"
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            withCustomBarColorFromData
            showBarTops={false}
            verticalLabelRotation={30}
          />
        </ScrollView>
      )}

      <View style={styles.listContainer}>
        {data.map((item, index) => (
          <View key={index} style={[styles.listItem, { borderLeftColor: getBarColor(index) }]}>
            <Text style={styles.listText}>{index + 1}. {item.nombreCliente}</Text>
            <Text style={styles.listCount}>{item.ordenesCount} órdenes</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Componentes auxiliares
const LoadingView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <ActivityIndicator size="large" color="#4CAF50" />
  </View>
);

const NoDataView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.noDataText}>No hay datos de pacientes frecuentes.</Text>
  </View>
);

// Estilos optimizados para full width en web
const styles = StyleSheet.create({
  container: {
    marginTop: 25,
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
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Platform.OS === 'web' ? 20 : 10,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
  },
  listContainer: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderLeftWidth: 4,
    marginVertical: 4,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  listText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    flex: 1,
  },
  listCount: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
});

export default PacientesFrecuentes;