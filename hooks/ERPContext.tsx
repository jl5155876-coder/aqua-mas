import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, Customer, Sale, CartItem, Order, Employee, Vehicle, PaymentSplit, ViewType, QualityRecord, Task, Attendance, TicketConfig, CloudConfig, SavedReport, FuelRecord, Message, Role, ProductionConfig, AppNotification } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, BACKWASH_SEQUENCE, REGENERATION_SEQUENCE } from '../constants';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDocFromServer,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DEFAULT_PERMISSIONS: ViewType[] = ['dashboard', 'pos', 'orders', 'customers', 'logistics', 'inventory', 'whatsapp', 'production', 'sync', 'reports', 'settings', 'employees', 'quality', 'scanner', 'tickets', 'messages', 'notifications', 'fuel'];

const INITIAL_TICKET_CONFIG: TicketConfig = {
  businessName: 'AQUA+ FUNDADORES',
  rfc: 'AQUA900101-XXX',
  address: 'Calle del Agua #123, Col. Manantiales',
  phone: '33-1234-5678',
  footerMessage: '¡Gracias por tu preferencia! Frescura que hidrata tu vida.',
  website: 'www.aquafun.mx',
  socialMedia: '@aquafun_pro',
  extraNote: 'No hay cambios después de 24 horas.',
  logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 
  colorHex: '#0284c7',
  email: 'contacto@aquafun.mx',
  paperWidth: '80mm',
  showLogo: true,
  showQr: true,
  showFooter: true
};

const INITIAL_CLOUD_CONFIG: CloudConfig = {
  url: 'https://aquamasfundadores-default-rtdb.firebaseio.com/',
  apiKey: 't8rzxkeWbMIKGufdW7RV1j1bKS0TKf2gPkgmZ36A',
  autoSync: true,
  sharedMode: true
};

const getDeviceId = () => {
  let id = localStorage.getItem('aqua_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('aqua_device_id', id);
  }
  return id;
};

// --- SYNC HELPERS ---
const smartMerge = <T extends { id: string, lastUpdated?: number, timestamp?: number }>(
    localList: T[], 
    cloudPayload: any
): T[] => {
    const combinedMap = new Map<string, T>();
    
    // Normalize Cloud Data
    let cloudList: T[] = [];
    if (Array.isArray(cloudPayload)) {
        cloudList = cloudPayload;
    } else if (typeof cloudPayload === 'object' && cloudPayload !== null) {
        cloudList = Object.values(cloudPayload);
    }

    // Index Cloud Data
    const cloudMap = new Map<string, T>();
    cloudList.forEach(item => { if (item && item.id) cloudMap.set(item.id, item); });

    // Process Local vs Cloud
    localList.forEach(localItem => {
        const cloudItem = cloudMap.get(localItem.id);
        if (!cloudItem) {
            // Exists locally, not in cloud. Keep local.
            combinedMap.set(localItem.id, localItem);
        } else {
            // Conflict Resolution: Latest Timestamp Wins
            const localTime = localItem.lastUpdated || localItem.timestamp || 0;
            const cloudTime = cloudItem.lastUpdated || cloudItem.timestamp || 0;
            
            if (localTime >= cloudTime) {
                combinedMap.set(localItem.id, localItem);
            } else {
                combinedMap.set(localItem.id, cloudItem);
            }
            cloudMap.delete(localItem.id);
        }
    });

    // Add remaining New Cloud Items
    cloudMap.forEach((cloudItem, id) => {
        combinedMap.set(id, cloudItem);
    });

    return Array.from(combinedMap.values());
};

// Hook Logic Factory
const useERPFactory = () => {
  const [deviceId] = useState(getDeviceId());
  
  // --- SYNC STATE (Legacy/UI) ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncLog, setSyncLog] = useState<{timestamp: number, status: 'success' | 'error', message: string}[]>([]);

  const addSyncLog = (status: 'success' | 'error', message: string) => {
    const newLog = { timestamp: Date.now(), status, message };
    setSyncLog(prev => [newLog, ...prev].slice(0, 10)); // Keep last 10
  };

  // --- DATA STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ticketConfig, setTicketConfig] = useState<TicketConfig>(INITIAL_TICKET_CONFIG);
  const [productionConfig, setProductionConfig] = useState<ProductionConfig>({ 
    backwashSequence: BACKWASH_SEQUENCE, 
    regenerationSequence: REGENERATION_SEQUENCE 
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [emptyJugsStock, setEmptyJugsStockState] = useState<number>(50);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
    const saved = localStorage.getItem('aqua_cloud_config');
    return saved ? JSON.parse(saved) : INITIAL_CLOUD_CONFIG;
  });

  // Save cloud config to local storage when it changes
  useEffect(() => {
    localStorage.setItem('aqua_cloud_config', JSON.stringify(cloudConfig));
  }, [cloudConfig]);

  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'connection_test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    let unsubscribers: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      // Clean up previous listeners if any
      unsubscribers.forEach(unsub => unsub());
      unsubscribers = [];

      if (user) {
        unsubscribers = [
          onSnapshot(collection(db, 'products'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Product);
            setProducts(data.length > 0 ? data : INITIAL_PRODUCTS);
          }, (err) => handleFirestoreError(err, OperationType.GET, 'products')),

          onSnapshot(collection(db, 'customers'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Customer);
            setCustomers(data.length > 0 ? data : INITIAL_CUSTOMERS);
          }, (err) => handleFirestoreError(err, OperationType.GET, 'customers')),

          onSnapshot(collection(db, 'sales'), (snapshot) => {
            setSales(snapshot.docs.map(doc => doc.data() as Sale).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'sales')),

          onSnapshot(collection(db, 'orders'), (snapshot) => {
            setOrders(snapshot.docs.map(doc => doc.data() as Order).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'orders')),

          onSnapshot(collection(db, 'employees'), (snapshot) => {
            setEmployees(snapshot.docs.map(doc => doc.data() as Employee));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'employees')),

          onSnapshot(collection(db, 'vehicles'), (snapshot) => {
            setVehicles(snapshot.docs.map(doc => doc.data() as Vehicle));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'vehicles')),

          onSnapshot(collection(db, 'quality'), (snapshot) => {
            setQualityRecords(snapshot.docs.map(doc => doc.data() as QualityRecord).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'quality')),

          onSnapshot(collection(db, 'tasks'), (snapshot) => {
            setTasks(snapshot.docs.map(doc => doc.data() as Task).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'tasks')),

          onSnapshot(collection(db, 'attendance'), (snapshot) => {
            setAttendance(snapshot.docs.map(doc => doc.data() as Attendance).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'attendance')),

          onSnapshot(collection(db, 'saved_reports'), (snapshot) => {
            setSavedReports(snapshot.docs.map(doc => doc.data() as SavedReport).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'saved_reports')),

          onSnapshot(collection(db, 'messages'), (snapshot) => {
            setMessages(snapshot.docs.map(doc => doc.data() as Message).sort((a, b) => a.timestamp - b.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'messages')),

          onSnapshot(collection(db, 'notifications'), (snapshot) => {
            setNotifications(snapshot.docs.map(doc => doc.data() as AppNotification).sort((a, b) => b.timestamp - a.timestamp));
          }, (err) => handleFirestoreError(err, OperationType.GET, 'notifications')),

          onSnapshot(doc(db, 'config', 'global'), (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              if (data.ticketConfig) setTicketConfig(data.ticketConfig);
              if (data.productionConfig) setProductionConfig(data.productionConfig);
              if (data.emptyJugsStock !== undefined) setEmptyJugsStockState(data.emptyJugsStock);
            }
          }, (err) => handleFirestoreError(err, OperationType.GET, 'config/global'))
        ];
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // --- REFS FOR DATA ACCESS (Prevents stale closures in callbacks) ---
  const dataRef = useRef<any>({});

  useEffect(() => {
    dataRef.current = {
      products, customers, sales, orders, employees, vehicles, 
      qualityRecords, tasks, attendance, savedReports, messages,
      ticketConfig, productionConfig, notifications, emptyJugsStock
    };
  });

  // --- ACTIONS WITH FIRESTORE ---
  const addSale = async (customerId: string, items: CartItem[], total: number, paidAmount: number, splits: PaymentSplit[], returnedVacios: number, manualTimestamp?: number, vehicleId?: string) => {
    const timestamp = manualTimestamp || Date.now();
    const customer = customers.find(c => c.id === customerId);
    const prevBalance = customer?.balance || 0;
    const newBalance = prevBalance + (total - paidAmount);

    const newSale: Sale = {
      id: `TKT-${timestamp.toString().slice(-6)}-${deviceId}`,
      timestamp, customerId, customerAlias: customer?.alias || 'Anonimo',
      items, total, paidAmount, change: Math.max(0, paidAmount - total), paymentSplits: splits,
      emptyGarrafonsReturned: returnedVacios, synced: true, deviceId,
      previousBalance: prevBalance,
      newBalance: newBalance
    };
    
    try {
      const batch = writeBatch(db);
      
      // 1. Add Sale
      batch.set(doc(db, 'sales', newSale.id), newSale);
      
      // 2. Update Customer
      const customerRef = doc(db, 'customers', customerId);
      const jugsOnLoanDelta = items.filter(i => i.category==='Agua' && i.id === '1').reduce((a,b)=>a+b.quantity,0) - returnedVacios;
      batch.update(customerRef, {
        balance: newBalance,
        jugsOnLoan: Math.max(0, (customer?.jugsOnLoan || 0) + jugsOnLoanDelta),
        lastUpdated: Date.now()
      });
      
      // 3. Update Inventory (Vehicle or Plant)
      if (vehicleId && vehicleId !== 'plant') {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
          const newInventory = vehicle.inventory.map(i => { 
            const sold = items.find(x => x.id === i.id); 
            return sold ? { ...i, quantity: Math.max(0, i.quantity - sold.quantity) } : i 
          }).filter(i => i.quantity > 0);
          
          batch.update(vehicleRef, {
            inventory: newInventory,
            emptyJugs: (vehicle.emptyJugs || 0) + returnedVacios,
            currentLoad: newInventory.reduce((a,b)=>a+b.quantity,0),
            lastUpdated: Date.now()
          });
        }
      } else {
        // Update Plant Products
        items.forEach(soldItem => {
          const product = products.find(p => p.id === soldItem.id);
          if (product) {
            batch.update(doc(db, 'products', product.id), {
              stock: product.stock - soldItem.quantity,
              lastUpdated: Date.now()
            });
          }
        });
        // Update Plant Empty Jugs
        batch.set(doc(db, 'config', 'global'), { emptyJugsStock: emptyJugsStock + returnedVacios }, { merge: true });
      }

      await batch.commit();
      return newSale;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales/batch');
    }
  };

  const saveProduct = async (p: Product) => {
    try {
      await setDoc(doc(db, 'products', p.id), { ...p, lastUpdated: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${p.id}`);
    }
  };

  const saveCustomer = async (c: Customer) => {
    try {
      await setDoc(doc(db, 'customers', c.id), { ...c, lastUpdated: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customers/${c.id}`);
    }
  };

  const addOrder = async (o: Partial<Order>) => {
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}-${deviceId}`,
      timestamp: Date.now(), status: 'pendiente', priority: 1, items: [], total: 0, customerId: '', customerAlias: '', deviceId, lastUpdated: Date.now(), ...o
    } as Order;
    try {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${newOrder.id}`);
    }
  };

  const updateOrder = async (o: Order) => {
    try {
      await setDoc(doc(db, 'orders', o.id), { ...o, lastUpdated: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${o.id}`);
    }
  };

  const saveEmployee = async (e: Employee) => {
    try {
      await setDoc(doc(db, 'employees', e.id), { ...e, lastUpdated: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `employees/${e.id}`);
    }
  };

  // ... (Other functions follow same pattern)

  // Explicit helper for sync module to use
  const syncData = async (data?: any) => {
      // Manual merge if called from elsewhere
      if(data) {
          if (data.products) setProducts(prev => smartMerge(prev, data.products));
          if (data.customers) setCustomers(prev => smartMerge(prev, data.customers));
          if (data.sales) setSales(prev => smartMerge(prev, data.sales));
          if (data.orders) setOrders(prev => smartMerge(prev, data.orders));
          if (data.employees) setEmployees(prev => smartMerge(prev, data.employees));
          if (data.vehicles) setVehicles(prev => smartMerge(prev, data.vehicles));
          if (data.qualityRecords) setQualityRecords(prev => smartMerge(prev, data.qualityRecords));
          if (data.tasks) setTasks(prev => smartMerge(prev, data.tasks));
          if (data.attendance) setAttendance(prev => smartMerge(prev, data.attendance));
          if (data.messages) setMessages(prev => smartMerge(prev, data.messages));
          return true;
      }

      if (!cloudConfig.url) {
        addSyncLog('error', 'URL de nube no configurada');
        return false;
      }

      setIsSyncing(true);
      setSyncStatus('idle');

      try {
        const cleanUrlInput = cloudConfig.url || '';
        let cleanUrl = cleanUrlInput.trim();
        if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
          cleanUrl = `https://${cleanUrl}`;
        }
        cleanUrl = cleanUrl.replace(/\/$/, "");
        
        let idToken = '';
        try {
          if (auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
          }
        } catch (tokenErr) {
          console.warn("Could not retrieve Firebase Auth token:", tokenErr);
        }
        
        const tokenToUse = cloudConfig.apiKey || idToken;
        const authParam = tokenToUse ? `?auth=${tokenToUse}` : '';
        
        // Path depends on shared mode
        const syncPath = cloudConfig.sharedMode ? 'shared_data' : `devices/${deviceId}`;
        const endpoint = `${cleanUrl}/${syncPath}.json${authParam}`;

        // 1. PULL CLOUD DATA FIRST (To avoid overwriting other devices' changes)
        const getResponse = await fetch(endpoint);
        let cloudData: any = {};
        if (getResponse.ok) {
          cloudData = await getResponse.json() || {};
        }

        // 2. MERGE LOCAL DATA INTO CLOUD DATA
        // We use smartMerge to combine what we have locally with what's in the cloud
        const mergedPayload = {
          products: smartMerge<Product>(dataRef.current.products || [], cloudData.products),
          customers: smartMerge<Customer>(dataRef.current.customers || [], cloudData.customers),
          sales: smartMerge<Sale>(dataRef.current.sales || [], cloudData.sales),
          orders: smartMerge<Order>(dataRef.current.orders || [], cloudData.orders),
          employees: smartMerge<Employee>(dataRef.current.employees || [], cloudData.employees),
          vehicles: smartMerge<Vehicle>(dataRef.current.vehicles || [], cloudData.vehicles),
          qualityRecords: smartMerge<QualityRecord>(dataRef.current.qualityRecords || [], cloudData.qualityRecords),
          tasks: smartMerge<Task>(dataRef.current.tasks || [], cloudData.tasks),
          attendance: smartMerge<Attendance>(dataRef.current.attendance || [], cloudData.attendance),
          messages: smartMerge<Message>(dataRef.current.messages || [], cloudData.messages),
          lastSync: Date.now(),
          deviceId
        };

        // 3. PUSH MERGED DATA BACK
        const putResponse = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mergedPayload)
        });

        if (!putResponse.ok) throw new Error(`HTTP ${putResponse.status}`);

        // 4. UPDATE LOCAL STATE WITH MERGED DATA (In case cloud had newer items)
        setProducts(mergedPayload.products);
        setCustomers(mergedPayload.customers);
        setSales(mergedPayload.sales);
        setOrders(mergedPayload.orders);
        setEmployees(mergedPayload.employees);
        setVehicles(mergedPayload.vehicles);
        setQualityRecords(mergedPayload.qualityRecords);
        setTasks(mergedPayload.tasks);
        setAttendance(mergedPayload.attendance);
        setMessages(mergedPayload.messages);

        setSyncStatus('success');
        setLastSyncTime(Date.now());
        addSyncLog('success', `Datos sincronizados en ${cloudConfig.sharedMode ? 'Modo Compartido' : 'Modo Privado'}`);
        return true;
      } catch (err) {
        setSyncStatus('error');
        let errMsg = 'Error desconocido';
        let isFailedToFetch = false;

        if (err instanceof Error) {
          if (err.message === 'Failed to fetch') {
            isFailedToFetch = true;
            errMsg = 'No se pudo conectar al servidor de respaldo (Failed to fetch).';
            if (cloudConfig.url && cloudConfig.url.includes('aquamasfundadores-default-rtdb')) {
              errMsg += ' Nota: Está usando la URL por defecto, la cual no está inicializada. Configure su propio enlace de Firebase en ajustes.';
            } else {
              errMsg += ' Verifique la URL de su Firebase Realtime DB y su conexión a internet.';
            }
          } else {
            errMsg = err.message;
          }
        }

        if (isFailedToFetch) {
          console.warn("Sync background background timeout or network error (Failed to fetch):", errMsg);
        } else {
          console.error("Sync error:", err);
        }

        addSyncLog('error', `Error de sincronización: ${errMsg}`);
        return false;
      } finally {
        setIsSyncing(false);
      }
  };

  const pullData = async (targetDeviceId?: string) => {
    if (!cloudConfig.url) {
      addSyncLog('error', 'URL de nube no configurada');
      return false;
    }

    setIsSyncing(true);
    try {
      const cleanUrlInput = cloudConfig.url || '';
      let cleanUrl = cleanUrlInput.trim();
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }
      cleanUrl = cleanUrl.replace(/\/$/, "");
      
      let idToken = '';
      try {
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Could not retrieve Firebase Auth token:", tokenErr);
      }
      
      const tokenToUse = cloudConfig.apiKey || idToken;
      const authParam = tokenToUse ? `?auth=${tokenToUse}` : '';
      
      // If targetDeviceId is provided, we pull from that device's path
      // Otherwise, we pull from the current sync path (shared or private)
      const syncPath = targetDeviceId ? `devices/${targetDeviceId}` : (cloudConfig.sharedMode ? 'shared_data' : `devices/${deviceId}`);
      const endpoint = `${cleanUrl}/${syncPath}.json${authParam}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const cloudData = await response.json();
      if (!cloudData) {
        addSyncLog('error', 'No se encontraron datos en la nube');
        return false;
      }

      // Merge data into local state
      if (cloudData.products) setProducts(prev => smartMerge(prev, cloudData.products));
      if (cloudData.customers) setCustomers(prev => smartMerge(prev, cloudData.customers));
      if (cloudData.sales) setSales(prev => smartMerge(prev, cloudData.sales));
      if (cloudData.orders) setOrders(prev => smartMerge(prev, cloudData.orders));
      if (cloudData.employees) setEmployees(prev => smartMerge(prev, cloudData.employees));
      if (cloudData.vehicles) setVehicles(prev => smartMerge(prev, cloudData.vehicles));
      if (cloudData.qualityRecords) setQualityRecords(prev => smartMerge(prev, cloudData.qualityRecords));
      if (cloudData.tasks) setTasks(prev => smartMerge(prev, cloudData.tasks));
      if (cloudData.attendance) setAttendance(prev => smartMerge(prev, cloudData.attendance));
      if (cloudData.messages) setMessages(prev => smartMerge(prev, cloudData.messages));

      setLastSyncTime(Date.now());
      addSyncLog('success', 'Datos descargados y combinados');
      return true;
    } catch (err) {
      let errMsg = 'Error desconocido';
      let isFailedToFetch = false;

      if (err instanceof Error) {
        if (err.message === 'Failed to fetch') {
          isFailedToFetch = true;
          errMsg = 'No se pudo conectar al servidor de respaldo para descargar (Failed to fetch).';
          if (cloudConfig.url && cloudConfig.url.includes('aquamasfundadores-default-rtdb')) {
            errMsg += ' Nota: Está usando la URL por defecto, la cual no está inicializada. Configure su propio enlace de Firebase en ajustes.';
          } else {
            errMsg += ' Verifique la URL de su Firebase Realtime DB y su conexión a internet.';
          }
        } else {
          errMsg = err.message;
        }
      }

      if (isFailedToFetch) {
        console.warn("Pull data background timeout or network error (Failed to fetch):", errMsg);
      } else {
        console.error("Pull error:", err);
      }

      addSyncLog('error', `Error al descargar: ${errMsg}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // --- AUTO SYNC TO RTDB ---
  useEffect(() => {
    if (!cloudConfig.url || !cloudConfig.autoSync) return;

    const timer = setTimeout(() => {
      // Background sync
      syncData();
    }, 3000); // Sync every 3 seconds if changes occur

    return () => clearTimeout(timer);
  }, [
    products, customers, sales, orders, employees, vehicles, 
    qualityRecords, tasks, attendance, savedReports, messages,
    cloudConfig.url, cloudConfig.autoSync
  ]);

  // Re-export full context
  return {
    deviceId, isSyncing, syncStatus, lastSyncTime, syncLog,
    syncData: syncData as (data?: any) => Promise<boolean>,
    pullData: pullData as (id?: string) => Promise<boolean>,
    products, saveProduct, 
    deleteProduct: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    },
    customers, saveCustomer, 
    updateCustomer: async (c: Customer) => { 
      try {
        await setDoc(doc(db, 'customers', c.id), { ...c, lastUpdated: Date.now() });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `customers/${c.id}`);
      }
    },
    deleteCustomer: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
      }
    }, 
    importCustomers: async (newC: Customer[]) => { 
      try {
        const batch = writeBatch(db);
        newC.forEach(c => {
          batch.set(doc(db, 'customers', c.id), { ...c, lastUpdated: Date.now() });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'customers/import');
      }
    },
    sales, addSale, 
    resetSales: async () => { 
      // This is dangerous, usually we don't delete all sales in production
      // But for the sake of the request:
      try {
        const batch = writeBatch(db);
        sales.forEach(s => batch.delete(doc(db, 'sales', s.id)));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'sales/reset');
      }
    },
    orders, setOrders, addOrder, updateOrder,
    employees, saveEmployee, 
    deleteEmployee: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
      }
    },
    vehicles, 
    setVehicles: async (fn: React.SetStateAction<Vehicle[]>) => { 
      // This is a bit complex for Firestore, usually we update individual vehicles
      // If we must update all:
      const newVehicles = typeof fn === 'function' ? fn(vehicles) : fn;
      try {
        const batch = writeBatch(db);
        newVehicles.forEach(v => batch.set(doc(db, 'vehicles', v.id), { ...v, lastUpdated: Date.now() }));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'vehicles/batch');
      }
    },
    deleteVehicle: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'vehicles', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
      }
    },
    loadVehicle: async (vid: string, prod: Product, delta: number) => { 
      const v = vehicles.find(x => x.id === vid);
      if (!v) return;

      const currentInv = v.inventory || [];
      const existingItem = currentInv.find(i => i.id === prod.id);
      let newInv;
      if (existingItem) {
          newInv = currentInv.map(i => i.id === prod.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i);
      } else if (delta > 0) {
          newInv = [...currentInv, { ...prod, quantity: delta }];
      } else {
          newInv = currentInv;
      }
      newInv = newInv.filter(i => i.quantity > 0);
      const newLoad = newInv.reduce((acc, item) => acc + item.quantity, 0); 
      
      try {
        const batch = writeBatch(db);
        
        // Update Vehicle
        batch.update(doc(db, 'vehicles', vid), {
          inventory: newInv,
          currentLoad: newLoad,
          lastUpdated: Date.now()
        });

        // Track empty jugs transfer
        if (prod.id === '1') { 
            const plantProd = products.find(x => x.id === '1');
            if (plantProd) {
              if (delta > 0) { // Loading full jugs: decrement from plant
                  batch.update(doc(db, 'products', '1'), { stock: Math.max(0, plantProd.stock - delta), lastUpdated: Date.now() });
              } else if (delta < 0) { // Unloading full jugs: return to plant
                  batch.update(doc(db, 'products', '1'), { stock: plantProd.stock + Math.abs(delta), lastUpdated: Date.now() });
              }
            }
        }

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `vehicles/${vid}/load`);
      }
    },
    unloadEmptyJugs: async (vid: string, qty: number) => {
      const v = vehicles.find(x => x.id === vid);
      if (!v) return;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'vehicles', vid), { emptyJugs: Math.max(0, (v.emptyJugs || 0) - qty), lastUpdated: Date.now() });
        batch.set(doc(db, 'config', 'global'), { emptyJugsStock: emptyJugsStock + qty }, { merge: true });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `vehicles/${vid}/unloadEmpty`);
      }
    },
    loadEmptyJugs: async (vid: string, qty: number) => {
      const v = vehicles.find(x => x.id === vid);
      if (!v) return;
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'config', 'global'), { emptyJugsStock: Math.max(0, emptyJugsStock - qty) }, { merge: true });
        batch.update(doc(db, 'vehicles', vid), { emptyJugs: (v.emptyJugs || 0) + qty, lastUpdated: Date.now() });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `vehicles/${vid}/loadEmpty`);
      }
    },
    produceJugs: async (qty: number) => {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'config', 'global'), { emptyJugsStock: Math.max(0, emptyJugsStock - qty) }, { merge: true });
        
        const idsToUpdate = ['1', '5', '6', '7'];
        idsToUpdate.forEach(id => {
          const p = products.find(x => x.id === id);
          if (p) {
            let newStock = p.stock;
            if (id === '1') newStock += qty;
            else newStock = Math.max(0, p.stock - qty);
            batch.update(doc(db, 'products', id), { stock: newStock, lastUpdated: Date.now() });
          }
        });

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'production/produce');
      }
    },
    emptyJugsStock,
    setEmptyJugsStock: async (qty: number | ((prev: number) => number)) => {
      const nextQty = typeof qty === 'function' ? qty(emptyJugsStock) : qty;
      setEmptyJugsStockState(nextQty);
      try {
        await setDoc(doc(db, 'config', 'global'), { emptyJugsStock: nextQty }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'config/global/emptyJugs');
      }
    },
    addFuelRecord: async (vid: string, rec: FuelRecord) => { 
      const v = vehicles.find(x => x.id === vid);
      if (!v) return;
      try {
        await updateDoc(doc(db, 'vehicles', vid), { 
          fuelHistory: [rec, ...v.fuelHistory], 
          lastUpdated: Date.now() 
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `vehicles/${vid}/fuel`);
      }
    },
    tasks, 
    addTask: async (t: Partial<Task>) => { 
      const newTask = { ...t, id: t.id || `TSK-${Date.now()}`, lastUpdated: Date.now() } as Task;
      try {
        await setDoc(doc(db, 'tasks', newTask.id), newTask);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tasks/${newTask.id}`);
      }
    },
    addTasks: async (ts: Task[]) => { 
      try {
        const batch = writeBatch(db);
        ts.forEach(t => batch.set(doc(db, 'tasks', t.id), { ...t, lastUpdated: Date.now() }));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'tasks/batch');
      }
    },
    updateTask: async (t: Task) => { 
      try {
        await setDoc(doc(db, 'tasks', t.id), { ...t, lastUpdated: Date.now() });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tasks/${t.id}`);
      }
    },
    updateTaskStatus: async (id: string, s: 'pendiente' | 'completada') => { 
      try {
        await updateDoc(doc(db, 'tasks', id), { status: s, lastUpdated: Date.now() });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tasks/${id}/status`);
      }
    },
    deleteTask: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
      }
    },
    clearTasksByDate: async (d: string) => { 
      try {
        const batch = writeBatch(db);
        tasks.filter(t => t.date === d).forEach(t => batch.delete(doc(db, 'tasks', t.id)));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/date/${d}`);
      }
    },
    attendance, 
    recordAttendance: async (eid: string, s: 'presente' | 'retardo' | 'falta') => { 
      const newAtt = { id: `ATT-${Date.now()}`, employeeId: eid, status: s, date: new Date().toISOString().split('T')[0], timestamp: Date.now() };
      try {
        await setDoc(doc(db, 'attendance', newAtt.id), newAtt);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `attendance/${newAtt.id}`);
      }
    },
    qualityRecords, 
    addQualityRecord: async (r: Partial<QualityRecord>) => { 
      const newRec = { ...r, id: `QUAL-${Date.now()}`, timestamp: Date.now() } as QualityRecord;
      try {
        await setDoc(doc(db, 'quality', newRec.id), newRec);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quality/${newRec.id}`);
      }
    },
    ticketConfig, 
    setTicketConfig: async (c: TicketConfig) => { 
      try {
        await setDoc(doc(db, 'config', 'global'), { ticketConfig: c }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'config/global/ticket');
      }
    },
    productionConfig, 
    setProductionConfig: async (c: ProductionConfig) => { 
      try {
        await setDoc(doc(db, 'config', 'global'), { productionConfig: c }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'config/global/production');
      }
    },
    cloudConfig, 
    setCloudConfig,
    savedReports, 
    addSavedReport: async (r: SavedReport) => { 
      try {
        await setDoc(doc(db, 'saved_reports', r.id), r);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `saved_reports/${r.id}`);
      }
    }, 
    deleteSavedReport: async (id: string) => { 
      try {
        await deleteDoc(doc(db, 'saved_reports', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `saved_reports/${id}`);
      }
    },
    messages, 
    sendMessage: async (txt: string, sid: string, rid: string) => { 
      const newMsg = { id: `MSG-${Date.now()}`, text: txt, senderId: sid, receiverId: rid, timestamp: Date.now(), read: false };
      try {
        await setDoc(doc(db, 'messages', newMsg.id), newMsg);
        
        // Push to Realtime DB for "Instant Messaging" if configured
        if (cloudConfig.url && cloudConfig.autoSync) {
          const cleanUrl = cloudConfig.url.trim().replace(/\/$/, "");
          const endpoint = `${cleanUrl}/messages/${newMsg.id}.json${cloudConfig.apiKey ? `?auth=${cloudConfig.apiKey}` : ''}`;
          fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMsg)
          }).catch(err => console.error("Error pushing message to RTDB:", err));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `messages/${newMsg.id}`);
      }
    },
    markMessagesAsRead: async (sid: string, rid: string) => {
      try {
        const batch = writeBatch(db);
        messages.filter(m => m.senderId === sid && m.receiverId === rid).forEach(m => {
          batch.update(doc(db, 'messages', m.id), { read: true });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'messages/read');
      }
    },
    notifications, 
    addNotification: async (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => { 
      const newNotif = { ...n, id: `NOT-${Date.now()}`, timestamp: Date.now(), read: false } as AppNotification;
      try {
        await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `notifications/${newNotif.id}`);
      }
    }, 
    markNotificationRead: async (id: string) => {
      try {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `notifications/${id}/read`);
      }
    },
    deleteNotification: async (id: string) => {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
      }
    },
    clearAllNotifications: async () => {
      try {
        const batch = writeBatch(db);
        notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'notifications/clear');
      }
    },
    firebaseUser
  };
};

const ERPContext = createContext<ReturnType<typeof useERPFactory> | null>(null);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useERPFactory();
  return <ERPContext.Provider value={data}>{children}</ERPContext.Provider>;
};

export const useERPDataHook = () => {
  const context = useContext(ERPContext);
  if (!context) throw new Error("useERPData must be used within ERPProvider");
  return context;
};