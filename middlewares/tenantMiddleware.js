import AppError from "../utils/appError.js";

export const resolveTenant=(req,res,next)=>{
    let tenantId= req.headers["x-tenant-id"]||req.query.tenantId;
    if (!tenantId && req.user && req.user.company){
        tenantId=req.user.company.toString();
    }

    req.tenantId = tenantId||null;
    next();
};

export const requireTenant=(req,res,next)=>{
    if(!req.tenantId){
        return next (
            new AppError("tenant context missing. provide a valid tenant identifier",400)

        );
    }
    next();
}