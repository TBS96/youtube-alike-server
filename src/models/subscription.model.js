import { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,    // one who is subscribing
            ref: 'User'
        },
        channel: {
            type: Schema.Types.ObjectId,    // one to whom 'subscriber' is subscribing
            ref: 'User'
        },
    },
    {
        timestamps: true
    }
);

export const Subscription = model('Subscription', subscriptionSchema);






// NOTE:
// to find subscribers of a channel, find and select the 'CHANNEL value' from the subscription model + from the documents created. DONT SELECT THE USERS.

// to find how many channels a user has subscribed, select 'SUBSCRIBER' value from schema

// just make sure that 'subscribers are received from channels' and 'channels are received from subscribers'