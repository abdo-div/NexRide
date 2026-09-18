import catchAsync from "../utils/catchAsync.js";
import * as serviceFactory from "../services/serviceFactory.js";


export const deleteOne=(Model)=>catchAsync(async(req,res,next)=>{
    await serviceFactory.deleteOne(Model)(req.params.id);

    res.status(204).json({
        status:'success',
        data:null,
    })
});


export const updateOne=(Model)=>catchAsync(async(req,res,next)=>{
    const doc=await serviceFactory.updateOne(Model)(req.params.id,
        req.body
    );

    res.status(200).json({
        status:'success',
        data:{
            data:doc
        }
    })
})


export const createOne=(Model)=>catchAsync(async(req,res,next )=>{
    const doc=await serviceFactory.createOne(Model)(req.body);

    res.status(201).json({
        status:'success',
        data:{
            data:doc
        }
    })
});


export const getOne=(Model,popOptions)=>catchAsync(async(req,res,next)=>{
    const doc=await serviceFactory.getOne(Model, popOptions)(req.params.id);
    res.status(200).json({
        status:'success',
        data:{
            data:doc
        }
    })
});


export const getAll=(Model)=>catchAsync(async(req,res,next)=>{
    const {results,data}=await serviceFactory.getAll(Model)(req.query);

    res.status(200).json({
        status:'success',
        results,
        data:{
            data
        }
    })
})