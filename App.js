import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EmployeeManagementScreen from './src/screens/EmployeeManagementScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import MaterialsDetailScreen from './src/screens/MaterialsDetailScreen';
import OrderTypeSelectionScreen from './src/screens/OrderTypeSelectionScreen';
import MajorOrderScreen from './src/screens/MajorOrderScreen';
import MinorOrderScreen from './src/screens/MinorOrderScreen';
import MinorOrderBidScreen from './src/screens/MinorOrderBidScreen';
import MinorOrdersManagementScreen from './src/screens/MinorOrdersManagementScreen';
import MinorOrderBidsManagementScreen from './src/screens/MinorOrderBidsManagementScreen';
import MinorOrderOptionsScreen from './src/screens/MinorOrderOptionsScreen';
import OrdersTrackingScreen from './src/screens/OrdersTrackingScreen';
import InStockOrdersScreen from './src/screens/InStockOrdersScreen';
import OrderReceiptScreen from './src/screens/OrderReceiptScreen';
import ProjectMaterialUsageScreen from './src/screens/ProjectMaterialUsageScreen';
import ManageOrdersScreen from './src/screens/ManageOrdersScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import BarcodeGenerationScreen from './src/screens/BarcodeGenerationScreen';
import SearchQRCodeScreen from './src/screens/SearchQRCodeScreen';
import ItemQRCodesScreen from './src/screens/ItemQRCodesScreen';
import EnquiryScreen from './src/screens/EnquiryScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import MasterMaterialListScreen from './src/screens/MasterMaterialListScreen';
import MasterVendorListScreen from './src/screens/MasterVendorListScreen';
import CreatePOScreen from './src/screens/CreatePOScreen';
import SendRequirementsScreen from './src/screens/SendRequirementsScreen';
import RequirementsScreen from './src/screens/RequirementsScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import OutStockRequestsScreen from './src/screens/OutStockRequestsScreen';
import InternalJobWorkScreen from './src/screens/InternalJobWorkScreen';
import StoreInchargeJobWorkScreen from './src/screens/StoreInchargeJobWorkScreen';
import ExternalJobworkMaterialNotificationScreen from './src/screens/ExternalJobworkMaterialNotificationScreen';
import ExternalJobworkChallanScreen from './src/screens/ExternalJobworkChallanScreen';
import ExternalJobworkReceiptScreen from './src/screens/ExternalJobworkReceiptScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmployeeManagement"
          component={EmployeeManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProjectDetails"
          component={ProjectDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MaterialsDetail"
          component={MaterialsDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderTypeSelection"
          component={OrderTypeSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MajorOrder"
          component={MajorOrderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MinorOrder"
          component={MinorOrderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MinorOrderBid"
          component={MinorOrderBidScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MinorOrdersManagement"
          component={MinorOrdersManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MinorOrderBidsManagement"
          component={MinorOrderBidsManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MinorOrderOptions"
          component={MinorOrderOptionsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrdersTracking"
          component={OrdersTrackingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InStockOrders"
          component={InStockOrdersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrderReceipt"
          component={OrderReceiptScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreatePO"
          component={CreatePOScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ManageOrders"
          component={ManageOrdersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BarcodeGeneration"
          component={BarcodeGenerationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SearchQRCode"
          component={SearchQRCodeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ItemQRCodes"
          component={ItemQRCodesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProjectMaterialUsage"
          component={ProjectMaterialUsageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Enquiry"
          component={EnquiryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProjectList"
          component={ProjectListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MasterMaterialList"
          component={MasterMaterialListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MasterVendorList"
          component={MasterVendorListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SendRequirements"
          component={SendRequirementsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Requirements"
          component={RequirementsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OutStockRequests"
          component={OutStockRequestsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InternalJobWork"
          component={InternalJobWorkScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StoreInchargeJobWork"
          component={StoreInchargeJobWorkScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExternalJobworkMaterialNotification"
          component={ExternalJobworkMaterialNotificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExternalJobworkChallan"
          component={ExternalJobworkChallanScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExternalJobworkReceipt"
          component={ExternalJobworkReceiptScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
