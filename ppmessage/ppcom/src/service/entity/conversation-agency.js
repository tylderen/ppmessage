//
// You can do the following things:
//
// - `request` request default conversation
//     - If can not get default conversation, generally meaning we should waiting ... waiting ... the server to
//       give us a conversation when it become avaliable.
//
// - `create` request create a conversation by `member_list`
//     - If can not get conversation, meaning you should waiting ...
//       
// - `cancel` cancel request default conversation
//
Service.$conversationAgency = ( function() {

    var STATE = {
        REQUESTING: 0, // in requesting
        DONE: 1, // we have fetched default conversation successfully
        CANCEL: 2 // we have cancel request the default conversation
    },

        state = STATE.REQUESTING,
        defaultConversation,
        inDebuging = false;
    
    //////// API ///////////
    
    return {
        enableDebug: enableDebug, // Only for debug
        
        request: asyncGetDefaultConversation,
        requestInfo: asyncGetConversationInfo,
        create: asyncCreateConversation,
        cancel: cancelWaitingCreateConversation,

        tellDefaultConversationAvaliable: tellDefaultConversationAvaliable,
        isDefaultConversationAvaliable: isDefaultConversationAvaliable,
    }

    ///// Implement //////////
    
    function asyncGetDefaultConversation( callback ) {
        if ( state === STATE.DONE && defaultConversation ) {
            $onResult( defaultConversation, callback );
            return;
        }

        state = STATE.REQUESTING;
        
        Service.$api.getPPComDefaultConversation( {
            app_uuid: Service.$app.appId(),
            user_uuid: Service.$user.quickId(),
            device_uuid: Service.$user.quickDeviceUUID()
        }, function( r ) {

            if ( !shouldWaiting( r ) ) {
                defaultConversation = r;
                state = STATE.DONE;
            }

            $onResult( defaultConversation, callback );
            
        }, function( e ) {

            $onResult( defaultConversation, callback );
            
        } );
    }

    // Get conversationInfo from server by `conversationUUID`
    // @param conversationUUID
    // @param callback
    function asyncGetConversationInfo( conversationUUID, callback ) {
        if ( !conversationUUID ) {
            $onResult( undefined, callback );
            return;
        }
        
        Service.$api.getConversationInfo( {
            app_uuid: Service.$app.appId(),
            user_uuid: Service.$user.quickId(),
            conversation_uuid: conversationUUID
        }, function( r ) {
            $onResult( r , callback );
        }, function( e ) {
            $onResult( undefined , callback );
        } );        
    }

    // @param config {
    //     user_uuid: xxx, create a conversation with `member_list`
    // }
    // provided `user_uuid`
    function asyncCreateConversation( config, callback ) {
        state = STATE.REQUESTING;
        
        Service.$api.createPPComConversation( {
            user_uuid: Service.$user.getUser().getInfo().user_uuid,
            app_uuid: Service.$ppSettings.getAppUuid(),
            conversation_type: Service.Constants.MESSAGE.TO_TYPE,
            member_list: ( config.user_uuid !== undefined ) ? [ config.user_uuid ] : undefined
        }, function( r ) {

            var result = undefined;
            
            if ( !shouldWaiting( r ) ) {
                result = r;
                state = STATE.DONE;
            }

            $onResult( result, callback );
            
        }, function( e ) {
            
            $onResult( undefined, callback );
            
        } );
    }

    function cancelWaitingCreateConversation() {
        if ( state !== STATE.REQUESTING ) {
            return;
        }

        Service.$api.cancelWaitingCreateConversation( {
            app_uuid: Service.$app.appId(),
            user_uuid: Service.$user.quickId(),
        }, onCompleted, onCompleted );

        function onCompleted( someThing ) {
            state = STATE.CANCEL;
        }
        
    }

    function isDefaultConversationAvaliable() {
        return defaultConversation !== undefined;
    }

    function tellDefaultConversationAvaliable( conv ) {
        defaultConversation = conv;
    }

    // === helpers ===
    function shouldWaiting( response ) {
        return inDebuging ||
            response.error_code !== 0 ||
            Service.$tools.isApiResponseEmpty( response );
    }

    function enableDebug( enable ) {
        inDebuging = enable;
    }
    
} )();
