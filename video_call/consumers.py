from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.layers import get_channel_layer
import json

class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = 'masti_time'
        members = await self.member_count()
        print('members>>>>', members)
        # if members > 2:
        #     return
        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )
        await self.accept()
        # print('Connected')

    async def disconnect(self, close_code):
        message = {'status': 'disconnect'}
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': 'send.sdp',
                'message': message
            }
        )
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )
        members = await self.member_count()
        print('members>>>>', members)
        # print('Disconnected')

    async def receive(self, text_data):
        json_data = json.loads(text_data)
        action = json_data['action']

        if action == 'new-offer' or action == 'new-answer':
            receiver_channel_name = json_data['message']['receiver_channel_name']
            json_data['message']['receiver_channel_name'] = self.channel_name
            await self.channel_layer.send(
                receiver_channel_name,
                {
                    'type': 'send.sdp',
                    'message': json_data
                }
            )
            return

        json_data['message']['receiver_channel_name'] = self.channel_name
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': 'send.sdp',
                'message': json_data
            }
        )

    async def send_sdp(self, event):
        message = event['message']
        await self.send(
            text_data=json.dumps(message)
        )

    async def member_count(self):
        group_info = self.channel_layer.channels
        members = len(group_info)
        return members
