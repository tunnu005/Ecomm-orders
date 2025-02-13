import { Request,Response,RequestHandler} from 'express'
import { confirmSeller, createConfirmation, createorder, deliveryassignment, deliveryCharge, deliveryPickup, loggingStatusHistory, updateassignment, updateConfirmation, updateConfirmSeller, updatepickup } from './queries'
import { pool } from './dbconnection'
import { finddeliveryPartner, getAssignmentId } from './utilities'


export const calculateDeliverycharges:RequestHandler = async(req: Request, res: Response) =>{
    const address_id = parseInt(req.params.address_id)
    try {
        if(!address_id){
            res.status(400).json({ message:'address_id is required'})
            return
        }
        const delivercharge = await deliveryCharge(address_id)
        res.json({ delivercharge })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message:'Error calculating delivery charges'})
    }
}

export const placeorder:RequestHandler = async(req: Request, res: Response) =>{
    const { address_id,product_id,total_amount,quantity,need_otp,order_date,payment_status,payment_method,note,taxt,delivery_charge} = req.body;
    const user_id = ( req as any).user_id
    try {
        if(!address_id || !user_id || !product_id ){
            res.status(400).json({ message:'all field are required'})
            return
        }

       const order_id = await createorder(address_id,user_id,product_id,total_amount,quantity,need_otp,order_date,payment_status,payment_method,note,taxt,delivery_charge)
       console.log(order_id)
       res.json({ message : "order created successfully" })

       const confirmation_id = await confirmSeller(order_id)
       await loggingStatusHistory(order_id,'order placed')
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error creating order'})
    }
}

export const seller_confirmation:RequestHandler = async(req:Request, res:Response) =>{
    const { confirmation_id,status } = req.body;
    try {
        if(!confirmation_id ||!status){
            res.status(400).json({ message:'confirmation_id and status are required'})
            return
        }

        const query = `SELECT order_id FROM seller_confirmation WHERE confirmation_id = ${confirmation_id}`
        const result = await pool.query(query)
        if(result.rows.length===0){
            res.status(404).json({ message: 'Confirmation not found'})
            return
        }
        const order_id = result.rows[0].order_id
        await updateConfirmSeller(confirmation_id,status)
        res.json({ message: 'Seller confirmation updated successfully'})
        await loggingStatusHistory(order_id,'Preparing Order')
        const partner_id = await finddeliveryPartner(order_id)

        const assignment_id =await deliveryassignment(order_id,partner_id,new Date(),'scheduled delivery')
        await deliveryPickup(assignment_id,new Date(),partner_id)
        
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error confirming seller'})
    }
}

export const partnerPickup:RequestHandler = async(req:Request,res:Response) =>{
    const {order_id,partner_id} = req.body
    try {
       
        const assignment_id = await getAssignmentId(order_id)
        await loggingStatusHistory(order_id,'order pick up successfully')
        await updatepickup('pick up',assignment_id)
        await updateassignment('pick up',assignment_id,'Pick up')
        await createConfirmation(assignment_id)
    } catch (error) {
        console.error(error)
        res.status(500).json({message: 'Error while pickup'})
    }
}

export const delivered:RequestHandler = async(req:Request,res:Response)=>{
    const { order_id , partner_id} = req.body
    try {
        const assignment_id = await getAssignmentId(order_id)
        await loggingStatusHistory(order_id,'order delivered')
        await updateConfirmation(assignment_id,'Delivered successfully')
        await updateassignment('Delivered',assignment_id,'delivered successfully')
    } catch (error) {
        
    }
}


