import React from "react";
import { applyVehicleImageFallback } from "../lib/vehicleMapper";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

export const VehicleImage: React.FC<Props> = ({
  onError,
  loading = "lazy",
  decoding = "async",
  ...props
}) => (
  <img
    {...props}
    loading={loading}
    decoding={decoding}
    onError={(event) => {
      onError?.(event);
      applyVehicleImageFallback(event);
    }}
  />
);
