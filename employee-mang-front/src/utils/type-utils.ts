export function getEmployeeName(employee: any): string {
  if (typeof employee === 'string') return employee;
  return employee?.name || 'Unknown';
}

export function getEmployeeDepartment(employee: any): string {
  if (typeof employee === 'string') return 'N/A';
  return employee?.department || 'N/A';
}

export function getManagerName(manager: any): string {
  if (!manager) return 'Not assigned';
  if (typeof manager === 'string') return manager;
  return manager?.name || 'Unknown';
}

export function normalizeStatus(status: string): string {
  return status.replace(/_/g, ' ');
}




// Add this function to your existing type-utils.ts file
export function replaceUnderscores(text: string): string {
  return text.replace(/_/g, ' ');
}

// Comprehensive driver utility functions
export function getDriver(driverData: any): any {
  if (!driverData) return null;
  // If it's already the driver object
  if (typeof driverData === 'object' && driverData.name) {
    return driverData;
  }
  // If it's a string ID, we can't resolve it here
  return null;
}

export function getDriverName(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.name || 'Not assigned';
}

export function getDriverContact(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.contactNumber || 'N/A';
}

export function getDriverAlternateContact(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.alternateContact || 'N/A';
}

export function getDriverCarModel(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.carModel || 'N/A';
}

export function getDriverCarNumber(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.carNumber || 'N/A';
}

export function getDriverLicenseNumber(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.licenseNumber || 'N/A';
}

export function getDriverCapacity(driverData: any): number {
  const driver = getDriver(driverData);
  return driver?.capacity || 4;
}

export function getDriverRating(driverData: any): number {
  const driver = getDriver(driverData);
  return driver?.rating || 0;
}

export function getDriverCarColor(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.carColor || 'N/A';
}

export function getDriverCurrentLocation(driverData: any): string {
  const driver = getDriver(driverData);
  return driver?.currentLocation || 'N/A';
}

export function getDriverTotalTrips(driverData: any): number {
  const driver = getDriver(driverData);
  return driver?.totalTrips || 0;
}