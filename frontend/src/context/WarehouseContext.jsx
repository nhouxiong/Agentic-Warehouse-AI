import { createContext, useContext } from "react";

const WarehouseContext = createContext({
  warehouse: "Chicago DC-1",
  date: "",
});

export function WarehouseProvider({ warehouse, date, children }) {
  return (
    <WarehouseContext.Provider value={{ warehouse, date }}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouse() {
  return useContext(WarehouseContext);
}
