import React from "react";
import { vehiclePlaceholderImage } from "../lib/vehicleMapper";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

export const VehicleImage: React.FC<Props> = ({ onError, ...props }) => (
  <img
    {...props}
    onError={(event) => {
      onError?.(event);
      if (event.currentTarget.getAttribute("src") !== vehiclePlaceholderImage) {
        event.currentTarget.src = vehiclePlaceholderImage;
      }
    }}
  />
);
