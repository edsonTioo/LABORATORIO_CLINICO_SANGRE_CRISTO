import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';

const CardWarning = ({scrollEnabled = true}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const baseURL = Platform.OS === 'android' 
          ? 'http://10.0.2.2:5090/api/Ordenes/ordenes-con-detalles' 
          : 'http://localhost:5090/api/Ordenes/ordenes-con-detalles';
        
        const response = await fetch(baseURL);
        if (!response.ok) throw new Error('Error al cargar las órdenes');
        
        const data = await response.json();
        
        // Filtrar solo órdenes FACTURADAS (excluir COMPLETADAS y ANULADAS)
        const filteredOrders = data.$values.filter(order => 
          order.estado === "FACTURADO"
        );

        // Ordenar por fecha de entrega más cercana
        const sortedOrders = filteredOrders.sort((a, b) => 
          new Date(a.fechaEntrega) - new Date(b.fechaEntrega)
        );

        setOrders(sortedOrders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const renderOrderCard = ({ item }) => {
    const deliveryDate = new Date(item.fechaEntrega);
    const today = new Date();
    const daysLeft = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
    const isUrgent = daysLeft <= 3;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>Orden #{item.idOrden}</Text>
          <Text style={[styles.deliveryTag, isUrgent && styles.urgentTag]}>
            {isUrgent ? 'URGENTE' : 'PENDIENTE'}
          </Text>
        </View>
        
        <Text style={styles.clientName}>{item.clienteId}</Text>
        <Text style={styles.doctorName}>Médico: {item.medicoId}</Text>
        
        <Text style={styles.sectionTitle}>Exámenes:</Text>
        {item.detalles.$values.map((exam, index) => (
          <View key={`${item.idOrden}-${index}`} style={styles.examItem}>
            <Text style={styles.examName}>• {exam.tipoExamen}</Text>
            <Text style={styles.examDetails}>{exam.muestra} - ${exam.precioExamen}</Text>
          </View>
        ))}
        
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryText}>
            Entrega: {deliveryDate.toLocaleDateString('es-ES', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            })}
          </Text>
          <Text style={[styles.daysLeft, isUrgent && styles.urgentText]}>
            ({daysLeft} día{daysLeft !== 1 ? 's' : ''})
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

return (
    <View style={{flex: 1}}>
   <FlatList
  data={orders}                      // ✔ Usa tu estado de órdenes
  renderItem={renderOrderCard}      // ✔ Usa tu función definida arriba
  keyExtractor={item => item.idOrden.toString()}
  scrollEnabled={scrollEnabled}
  contentContainerStyle={{ paddingBottom: 20 }}
  ListEmptyComponent={
    <View style={styles.center}>
      <Text style={styles.emptyText}>No hay órdenes pendientes</Text>
    </View>
  }
/>

    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
     backgroundColor: '#f5f5f5',
  },
  center: {
 flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  deliveryTag: {
    backgroundColor: '#3498db',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  urgentTag: {
    backgroundColor: '#e74c3c',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 4,
  },
  examItem: {
    marginBottom: 8,
  },
  examName: {
    fontSize: 14,
    color: '#34495e',
  },
  examDetails: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 16,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  deliveryText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  daysLeft: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  urgentText: {
    color: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
});

export default CardWarning;