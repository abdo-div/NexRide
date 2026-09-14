import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Company",
        required:[true,"A vehicle must belong to a rental company"],
        index:true
    },
    make:{
        type:String,
        required:[true,"vehicle make is required toyota, ford, etc"],
        trim:true,
        index:true
    },
    model:{
        type:String,
        required:[true,"vehicle model is required corolla, fiesta, etc"],
        trim:true
    },
    year:{
        type:Number,
        required:[true,"vehicle year is required"],
        min:[1900,"vehicle year cannot be before 1900"],
        max:[new Date().getFullYear()+1,"vehicle year cannot be in the future"],

    },
    type:{
        type:String,
        required:[true,"vehicle type is required"],
        enum:{
            values:["SEDAN","SUV","HATCHBACK","LUXURY","VAN","PICKUP"],
            message:"invalid vehicle type"
        },
        index:true
    },
    transmission:{
        type:String,
        required:[true,"Transmission type is required"],
        enum:{
            values:["MANUAL","AUTOMATIC"],
            message:"invalid transmission type"
        }
    },
    fuelType:{
        type:String,
        required:[true,"fuel type is required"],
        enum:{
            values:["GASOLINE","DIESEL","ELECTRIC","HYBRID"],
            message:"invalid fuel type"
        }

    },
    seats:{
        type:Number,
        required:[true,"number of seats is required"],
        min:[1,"vehicle must have at least 1 seat"],
        max:[20,"vehicle cannot have more than 20 seats"],

    },
    doors:{
        type:Number,
        default:4,

    },
    description:{
        type:String,
        trim:true,
        maxlength:[500,"description cannot exceed 500 characters"],

    },
    photos:{
        type:[String],
        validate:[(val)=>val.length>0,"at least one photo is required"],
    },
    dailyPrice:{
        type:String,
        required:[true,"daily rental price is required in LYD"],
        min:[0,"daily rental price cannot be negative"],
        index:true,

    },
    weeklyPrice:{
        type:Number,
        default:null
    },
    operationalStatus:{
        type:String,
        enum:{
            values:["AVAILABLE","MAINTENANCE","UNAVAILABLE"],
            message:"operational status must be AVAILABLE , MAINTENANCE or UNAVAILABLE"
        },
        default:"AVAILABLE",
        index:true
    },
    listingStatus:{
        type:String,
        enum:{
          valuse:["DRAFT","PUBLISHED","SUSPENDED"],
          message:"listing status must be DRAFT ,PUBLISHED or SUSPENDED"  
        },
        default :"PUBLISHED",
        index:true,
    },
    city:{
        type:String,
        required:[true,"city location is required"],
        trim:true,
        index:true

    },
    pickupLocation:{
        type:String,
        required:[true,"specific pickup address or branch is required"],
        trim:true
    },
    deleteAt:{
        type:Date,
        default:null,
        select:false
    },


},{
    timestamps:truek,
    toJSON:{virtuals:true},
    toObject:{virtuals:true},
    autoIndex:process.env.NODE_ENV !=="production",
});

// -----------------------------------------------------------------------------
// Indexes (Enables fast multi-filter customer search queries)
// -----------------------------------------------------------------------------
vehicleSchema.index({
  listingStatus: 1,
  operationalStatus: 1,
  city: 1,
  dailyPrice: 1,
});

vehicleSchema.index({ companyId: 1, listingStatus: 1 });

// -----------------------------------------------------------------------------
// Middleware & Hooks
// -----------------------------------------------------------------------------

// Exclude soft-deleted vehicles automatically from queries
vehicleSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// -----------------------------------------------------------------------------
// Virtual Population (Lookup vehicle reviews)
// -----------------------------------------------------------------------------
vehicleSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "vehicleId",
  justOne: false,
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;