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
        default:[],
        validate:[(val)=>val.length<=20,"A vehicle cannot have more than 20 photos"],
    },
    dailyPrice:{
        type:Number,
        required:[true,"daily rental price is required in LYD"],
        min:[0,"daily rental price cannot be negative"],
        index:true,

    },
    weeklyPrice:{
        type:Number,
        default:null,
        min:[0,"weekly rental price cannot be negative"]
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
          values:["DRAFT","PUBLISHED","SUSPENDED"],
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
    deletedAt:{
        type:Date,
        default:null,
        select:false
    },
    ratingsAverage:{
        type:Number,
        default:4.5,
        min:[1,"Average rating cannot be below 1"],
        max:[5,"Average rating cannot exceed 5"],
        set:(value)=>Math.round(value*10)/10
    },
    ratingsQuantity:{
        type:Number,
        default:0,
        min:[0,"Rating count cannot be negative"]
    },
    location:{
        type:{
            type:String,
            enum:["Point"]
        },
        coordinates:{
            type:[Number],
            validate:{
                validator:(value)=>!value || (value.length===2 && value[0]>=-180 && value[0]<=180 && value[1]>=-90 && value[1]<=90),
                message:"Location coordinates must be [longitude, latitude]"
            }
        }
    },

},{
    timestamps:true,
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
vehicleSchema.index({ location: "2dsphere" }, { sparse: true });

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