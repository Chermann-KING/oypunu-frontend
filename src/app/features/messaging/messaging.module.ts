import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MessagingRoutingModule } from './messaging-routing.module';
import { MessagingComponent } from './components/messaging/messaging.component';
import { ConversationsListComponent } from './components/conversations-list/conversations-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { NewConversationModalComponent } from './components/new-conversation-modal/new-conversation-modal.component';

@NgModule({
  declarations: [
    MessagingComponent,
    ConversationsListComponent,
    ChatWindowComponent,
    NewConversationModalComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MessagingRoutingModule,
  ],
})
export class MessagingModule {}
