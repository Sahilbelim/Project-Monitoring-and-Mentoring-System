import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  signal, computed, inject, ElementRef, ViewChild, NgZone, ChangeDetectorRef
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { environment }    from '../../../environments/environment';
import { ToastService }   from '../../core/services/toast.service';
import { AuthService }    from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { io, Socket }     from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member   { _id: string; name: string; email: string; avatar?: string; }
interface Channel  {
  _id: string; name?: string; type: 'dm' | 'group' | 'team' | 'project';
  members?: Member[]; memberIds?: any[]; unreadCount?: number;
  lastMessagePreview?: string;
}
interface Reaction  { emoji: string; userIds: string[]; }
interface Message  {
  _id: string; content: string; senderId: Member | string;
  createdAt: string; isEdited?: boolean; editedAt?: string;
  isDeletedForAll?: boolean; deletedForAll?: boolean;
  reactions?: Reaction[];
  replyToId?: any; replyToSnapshot?: { senderName?: string; content?: string };
  statuses?: Array<{ userId: string; status: 'sent' | 'delivered' | 'seen'; seenAt?: string }>;
  tempId?: string;
}

// Reaction picker set
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

@Component({
  selector:   'app-chat',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  styles: [`
    .msg-appear { animation: msgAppear 0.2s ease-out; }
    @keyframes msgAppear {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ctx-menu { animation: ctxIn 0.12s ease-out; }
    @keyframes ctxIn {
      from { opacity: 0; transform: scale(0.92) translateY(-4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    :host { display: contents; }
  `],
  template: `
    <div class="flex h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl">

      <!-- ────────────────────────────────────────────────────────────────────── -->
      <!-- SIDEBAR -->
      <!-- ────────────────────────────────────────────────────────────────────── -->
      <aside class="w-72 shrink-0 flex flex-col border-r border-slate-700/60 bg-slate-800/50 backdrop-blur"
             [class.hidden]="activeChannel() && isMobile">

        <!-- Sidebar header -->
        <div class="px-4 pt-4 pb-3 border-b border-slate-700/40">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h2 class="font-bold text-white text-base">Messages</h2>
              <!-- Connection dot -->
              <span class="relative flex h-2 w-2">
                @if (connected()) {
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                } @else {
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                }
              </span>
            </div>
            <button (click)="showNewChannel.set(true)"
                    class="w-7 h-7 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 hover:text-white flex items-center justify-center transition-all"
                    title="New chat">
              <i class='bx bx-plus text-lg'></i>
            </button>
          </div>
          <!-- Search -->
          <div class="relative">
            <i class='bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
            <input type="text" [(ngModel)]="channelSearch" (ngModelChange)="searchTerm.set(channelSearch)"
                   placeholder="Search chats…" class="input text-sm py-2 pl-9">
          </div>
        </div>

        <!-- Channel list -->
        <div class="flex-1 overflow-y-auto">
          @for (ch of filteredChannels(); track ch._id) {
            <button (click)="selectChannel(ch)"
                    class="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-l-2 relative group"
                    [class.border-indigo-500]="activeChannel()?._id === ch._id"
                    [class.border-transparent]="activeChannel()?._id !== ch._id"
                    [class.bg-indigo-500\/8]="activeChannel()?._id === ch._id">
              <!-- Avatar -->
              <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg"
                     [class]="chAvatarGradient(ch)">
                  {{ avatarChar(ch) }}
                </div>
                <!-- unread badge -->
                @if (ch.unreadCount && ch.unreadCount > 0) {
                  <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1 shadow">
                    {{ ch.unreadCount > 9 ? '9+' : ch.unreadCount }}
                  </span>
                }
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <p class="text-sm font-semibold text-white truncate">{{ displayName(ch) }}</p>
                </div>
                <p class="text-xs text-slate-400 truncate mt-0.5">
                  <span class="inline-flex items-center gap-1">
                    <i class='bx text-[10px]' [class]="chTypeIcon(ch)"></i>
                    {{ chTypeLabel(ch) }}
                  </span>
                </p>
              </div>
            </button>
          }
          @if (filteredChannels().length === 0 && !channelsLoading()) {
            <div class="p-6 text-center">
              <i class='bx bx-chat text-3xl text-slate-600 block mb-2'></i>
              <p class="text-slate-400 text-sm">No chats yet</p>
              <button (click)="showNewChannel.set(true)" class="btn-primary text-xs mt-3">+ Start a chat</button>
            </div>
          }
        </div>
      </aside>

      <!-- ────────────────────────────────────────────────────────────────────── -->
      <!-- CHAT AREA -->
      <!-- ────────────────────────────────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 relative" [class.hidden]="!activeChannel() && isMobile">

        <!-- Empty state -->
        @if (!activeChannel()) {
          <div class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div class="w-20 h-20 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
              <i class='bx bx-chat text-4xl text-indigo-400'></i>
            </div>
            <div>
              <p class="text-white font-bold text-xl">Select a conversation</p>
              <p class="text-slate-400 text-sm mt-1">Choose from the sidebar or start a new chat.</p>
            </div>
            <button (click)="showNewChannel.set(true)" class="btn-primary">
              <i class='bx bx-plus'></i> New Chat
            </button>
          </div>

        } @else {

          <!-- ── Chat topbar ─────────────────────────────────────────────────── -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60 bg-slate-800/60 backdrop-blur shrink-0">
            <button (click)="activeChannel.set(null)" class="btn-icon text-slate-400 hover:text-white md:hidden">
              <i class='bx bx-arrow-back text-lg'></i>
            </button>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg shrink-0"
                 [class]="chAvatarGradient(activeChannel()!)">
              {{ avatarChar(activeChannel()!) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-white text-sm truncate">{{ displayName(activeChannel()!) }}</p>
              @if (typingNames().length > 0) {
                <p class="text-xs text-indigo-400 italic flex items-center gap-1">
                  <span class="flex gap-0.5">
                    <span class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                    <span class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                    <span class="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                  </span>
                  {{ typingNames().join(', ') }} {{ typingNames().length === 1 ? 'is' : 'are' }} typing…
                </p>
              } @else {
                <p class="text-xs text-slate-400">
                  {{ activeChannel()!.type === 'dm' ? 'Direct message' : memberCountLabel() }}
                </p>
              }
            </div>
          </div>

          <!-- ── Reply banner ───────────────────────────────────────────────── -->
          @if (replyingTo()) {
            <div class="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 shrink-0">
              <i class='bx bx-reply text-indigo-400'></i>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-indigo-400 font-medium">Replying to {{ replyingTo()!.replyToSnapshot?.senderName ?? senderName(replyingTo()!) }}</p>
                <p class="text-xs text-slate-400 truncate">{{ replyingTo()!.content }}</p>
              </div>
              <button (click)="replyingTo.set(null)" class="text-slate-500 hover:text-white">
                <i class='bx bx-x text-sm'></i>
              </button>
            </div>
          }

          <!-- ── Messages scroll area ──────────────────────────────────────── -->
          <div #messagesEl class="flex-1 overflow-y-auto px-4 py-4 space-y-1" (click)="closeContextMenu()">
            <!-- Skeletons -->
            @if (loadingMsgs()) {
              <div class="space-y-4">
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="flex gap-3" [class.flex-row-reverse]="i % 2 === 0">
                    <div class="skeleton w-8 h-8 rounded-full shrink-0"></div>
                    <div class="flex flex-col gap-1" [class.items-end]="i % 2 === 0">
                      <div class="skeleton h-10 rounded-2xl" [style.width]="(80 + i * 30) + 'px'"></div>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Messages -->
            @for (msg of messages(); track msg._id; let isFirst = $first) {
              <!-- Date separator -->
              @if (isFirst || showDateSeparator(msg, messages()[$index - 1])) {
                <div class="flex items-center gap-3 py-3">
                  <div class="flex-1 h-px bg-slate-700/40"></div>
                  <span class="text-xs text-slate-500 shrink-0">{{ dateSep(msg.createdAt) }}</span>
                  <div class="flex-1 h-px bg-slate-700/40"></div>
                </div>
              }

              <div class="flex gap-2 msg-appear"
                   [class.flex-row-reverse]="isOwn(msg)"
                   [class.mb-1]="true">
                <!-- Avatar (not self) -->
                @if (!isOwn(msg)) {
                  <div class="w-8 h-8 rounded-full shrink-0 self-end mb-1 overflow-hidden flex items-center justify-center text-xs font-bold text-white"
                       [style.background]="senderColor(senderId(msg))">
                    {{ senderName(msg).charAt(0).toUpperCase() }}
                  </div>
                }

                <!-- Bubble group -->
                <div class="max-w-[72%] group flex flex-col relative" [class.items-end]="isOwn(msg)">
                  <!-- Sender name (not self) -->
                  @if (!isOwn(msg)) {
                    <p class="text-[11px] text-slate-400 mb-1 ml-1 font-medium">{{ senderName(msg) }}</p>
                  }

                  <!-- Reply snapshot -->
                  @if (msg.replyToSnapshot?.content) {
                    <div class="rounded-lg px-3 py-1.5 mb-1 max-w-full text-xs border-l-2 border-indigo-400"
                         [class]="isOwn(msg) ? 'bg-indigo-600/30 text-indigo-200' : 'bg-slate-700/60 text-slate-300'">
                      <p class="font-medium text-indigo-400 text-[10px]">{{ msg.replyToSnapshot?.senderName }}</p>
                      <p class="truncate opacity-80">{{ msg.replyToSnapshot?.content }}</p>
                    </div>
                  }

                  <!-- Bubble -->
                  <div class="relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-sm cursor-pointer transition-transform hover:scale-[1.01]"
                       [class]="bubbleClass(msg)"
                       (click)="$event.stopPropagation(); openContextMenu(msg, $event)">
                    @if (msg.deletedForAll || msg.isDeletedForAll) {
                      <em class="text-xs opacity-50 flex items-center gap-1">
                        <i class='bx bx-trash text-[11px]'></i> Message deleted
                      </em>
                    } @else {
                      <span class="whitespace-pre-wrap">{{ msg.content }}</span>
                    }
                  </div>

                  <!-- Reactions display -->
                  @if (msg.reactions && msg.reactions.length > 0) {
                    <div class="flex flex-wrap gap-1 mt-1" [class.justify-end]="isOwn(msg)">
                      @for (rxn of msg.reactions; track rxn.emoji) {
                        @if (rxn.userIds.length > 0) {
                          <button (click)="toggleReaction(msg, rxn.emoji)"
                                  class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all"
                                  [class]="hasMyReaction(msg, rxn.emoji) ? 'bg-indigo-500/30 border-indigo-500/60 text-indigo-300' : 'bg-slate-700/60 border-slate-600/60 text-slate-300 hover:border-indigo-500/40'">
                            {{ rxn.emoji }} {{ rxn.userIds.length }}
                          </button>
                        }
                      }
                    </div>
                  }

                  <!-- Time + status ticks -->
                  <div class="flex items-center gap-1 mt-0.5 px-1" [class.justify-end]="isOwn(msg)">
                    @if (msg.isEdited) {
                      <span class="text-[9px] text-slate-500 italic">edited</span>
                    }
                    <span class="text-[10px] text-slate-500">{{ msg.createdAt | date:'h:mm a' }}</span>
                    @if (isOwn(msg) && !msg.deletedForAll) {
                      <span class="text-[11px]" [class]="tickColor(msg)" [title]="tickTitle(msg)">
                        @if (isSeen(msg)) { ✓✓ }
                        @else if (isDelivered(msg)) { ✓✓ }
                        @else { ✓ }
                      </span>
                    }
                  </div>
                </div>
              </div>
            }

            <div #bottomAnchor></div>
          </div>

          <!-- ── Input bar ──────────────────────────────────────────────────── -->
          <div class="px-4 py-3 border-t border-slate-700/60 bg-slate-800/60 backdrop-blur shrink-0">
            <!-- Edit mode banner -->
            @if (editingMsg()) {
              <div class="flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                <i class='bx bx-edit text-amber-400'></i>
                <span class="text-amber-300 flex-1">Editing message</span>
                <button (click)="cancelEdit()" class="text-slate-400 hover:text-white">
                  <i class='bx bx-x'></i>
                </button>
              </div>
            }

            <form (submit)="$event.preventDefault(); sendOrSave()" class="flex gap-2 items-end">
              <!-- Emoji button -->
              <button type="button" (click)="showQuickEmoji = !showQuickEmoji"
                      class="btn-icon text-slate-400 hover:text-indigo-400 shrink-0 mb-1 transition-colors">
                <i class='bx bx-smile text-xl'></i>
              </button>
              <!-- Text input -->
              <div class="flex-1 relative">
                <!-- Quick emoji picker -->
                @if (showQuickEmoji) {
                  <div class="absolute bottom-full mb-2 left-0 flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-2 shadow-xl z-10">
                    @for (e of quickEmojis; track e) {
                      <button type="button" (click)="appendEmoji(e)" class="text-lg hover:scale-125 transition-transform p-1">{{ e }}</button>
                    }
                  </div>
                }
                <textarea
                  #inputEl
                  [(ngModel)]="msgText" name="msg"
                  (keydown)="onKey($event)"
                  (input)="onTypingInput()"
                  [placeholder]="editingMsg() ? 'Edit message…' : 'Type a message… (Enter to send)'"
                  rows="1"
                  class="input w-full resize-none max-h-32 min-h-[44px] py-2.5 text-sm leading-relaxed"
                ></textarea>
              </div>
              <!-- Send/Save -->
              <button type="submit"
                      [disabled]="!msgText.trim() || (!connected() && !editingMsg())"
                      class="shrink-0 mb-0.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                      [class]="msgText.trim() ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-700 text-slate-500 cursor-not-allowed'">
                <i class='bx text-lg' [class]="editingMsg() ? 'bx-check' : 'bxs-send'"></i>
              </button>
            </form>
          </div>
        }
      </div>

      <!-- ─────────────────────────────────────────────────────────────────────
           CONTEXT MENU (right-click / tap bubble)
           ───────────────────────────────────────────────────────────────────── -->
      @if (ctxMenu()) {
        <div class="fixed z-[100] ctx-menu bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden min-w-[160px] py-1"
             [style.left.px]="ctxMenu()!.x"
             [style.top.px]="ctxMenu()!.y"
             (click)="$event.stopPropagation()">
          <!-- Reaction strip -->
          @if (!ctxMenu()!.msg.deletedForAll) {
            <div class="flex gap-1 px-3 py-2 border-b border-slate-700/40">
              @for (e of quickEmojis; track e) {
                <button (click)="toggleReaction(ctxMenu()!.msg, e); closeContextMenu()"
                        class="text-lg hover:scale-125 transition-transform p-0.5">{{ e }}</button>
              }
            </div>
          }
          <!-- Reply -->
          <button (click)="replyTo(ctxMenu()!.msg); closeContextMenu()"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
            <i class='bx bx-reply text-base text-slate-400'></i> Reply
          </button>
          <!-- Copy -->
          @if (!ctxMenu()!.msg.deletedForAll) {
            <button (click)="copyMsg(ctxMenu()!.msg); closeContextMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <i class='bx bx-copy text-base text-slate-400'></i> Copy
            </button>
          }
          <!-- Edit (own, not deleted) -->
          @if (isOwn(ctxMenu()!.msg) && !ctxMenu()!.msg.deletedForAll) {
            <button (click)="startEdit(ctxMenu()!.msg); closeContextMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <i class='bx bx-edit text-base text-slate-400'></i> Edit
            </button>
          }
          <!-- Delete for me -->
          <button (click)="deleteMsg(ctxMenu()!.msg, false); closeContextMenu()"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-rose-400 transition-colors">
            <i class='bx bx-trash text-base text-slate-400'></i> Delete for me
          </button>
          <!-- Delete for all (own, not deleted) -->
          @if (isOwn(ctxMenu()!.msg) && !ctxMenu()!.msg.deletedForAll) {
            <button (click)="deleteMsg(ctxMenu()!.msg, true); closeContextMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
              <i class='bx bx-trash-alt text-base'></i> Delete for all
            </button>
          }
        </div>
      }

      <!-- ─────────────────────────────────────────────────────────────────────
           NEW CHAT MODAL
           ───────────────────────────────────────────────────────────────────── -->
      @if (showNewChannel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
             (click)="showNewChannel.set(false); resetNewCh()">
          <div class="card w-full max-w-md animate-slide-up space-y-4" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-white">New Chat</h3>
              <button (click)="showNewChannel.set(false); resetNewCh()" class="btn-icon text-slate-400 hover:text-white">
                <i class='bx bx-x text-xl'></i>
              </button>
            </div>

            <!-- Type toggle -->
            <div class="flex gap-2 p-1 bg-slate-700/40 rounded-xl">
              <button (click)="newCh.type='dm'"
                      [class]="newCh.type==='dm' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
                      class="flex-1 py-2 text-sm rounded-lg transition-all font-medium">
                <i class='bx bx-user mr-1'></i> Direct
              </button>
              <button (click)="newCh.type='group'"
                      [class]="newCh.type==='group' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'"
                      class="flex-1 py-2 text-sm rounded-lg transition-all font-medium">
                <i class='bx bx-group mr-1'></i> Group
              </button>
            </div>

            @if (newCh.type === 'group') {
              <div>
                <label class="label">Group Name *</label>
                <input type="text" [(ngModel)]="newCh.name" class="input" placeholder="e.g. Design Team Chat">
              </div>
            }

            <div>
              <label class="label">
                {{ newCh.type === 'dm' ? 'Select person *' : 'Add members *' }}
                <span class="text-slate-400 font-normal ml-1">({{ newCh.memberIds.length }} selected)</span>
              </label>
              <div class="max-h-56 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700/40">
                @for (u of orgUsers(); track u._id) {
                  <label class="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer">
                    <input type="checkbox"
                           [checked]="newCh.memberIds.includes(u._id)"
                           (change)="toggleMember(u._id, $event)"
                           class="rounded text-indigo-500 accent-indigo-500">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                         [style.background]="senderColor(u._id)">
                      {{ u.name.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-white truncate">{{ u.name }}</p>
                      <p class="text-xs text-slate-400 truncate">{{ u.email }}</p>
                    </div>
                  </label>
                }
              </div>
            </div>

            <div class="flex gap-3 pt-1">
              <button (click)="showNewChannel.set(false); resetNewCh()" class="btn-secondary flex-1">Cancel</button>
              <button (click)="createChannel()"
                      class="btn-primary flex-1"
                      [disabled]="newCh.memberIds.length === 0 || (newCh.type==='group' && !newCh.name) || newChSaving()">
                @if (newChSaving()) { <span class="animate-spin inline-block">⟳</span> }
                @else { <i class='bx bx-plus'></i> Create }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef;
  @ViewChild('messagesEl')   private messagesEl!: ElementRef;
  @ViewChild('inputEl')      private inputEl!: ElementRef;

  private http    = inject(HttpClient);
  private toast   = inject(ToastService);
  private auth    = inject(AuthService);
  private storage = inject(StorageService);
  private zone    = inject(NgZone);
  private cdr     = inject(ChangeDetectorRef);

  // ── State ──────────────────────────────────────────────────────────────────
  channels        = signal<Channel[]>([]);
  activeChannel   = signal<Channel | null>(null);
  messages        = signal<Message[]>([]);
  orgUsers        = signal<Member[]>([]);
  connected       = signal(false);
  loadingMsgs     = signal(false);
  channelsLoading = signal(false);
  showNewChannel  = signal(false);
  newChSaving     = signal(false);

  // Context menu
  ctxMenu   = signal<{ msg: Message; x: number; y: number } | null>(null);

  // Editing
  editingMsg  = signal<Message | null>(null);
  replyingTo  = signal<Message | null>(null);

  channelSearch = '';
  msgText       = '';
  isMobile      = window.innerWidth < 768;

  // Typing
  private typingMap = new Map<string, Set<string>>();
  typingNames       = signal<string[]>([]);

  // New-channel form
  newCh: { type: 'dm' | 'group'; name: string; memberIds: string[] } = { type: 'dm', name: '', memberIds: [] };

  // Emoji
  quickEmojis   = QUICK_REACTIONS;
  showQuickEmoji = false;

  // Seen tracking: latest seen userId → at
  private seenByMap = new Map<string, string>(); // userId → channelId seen at

  // Filter
  searchTerm       = signal('');
  filteredChannels = computed(() => {
    const q = this.searchTerm().toLowerCase();
    return q
      ? this.channels().filter(c => this.displayName(c).toLowerCase().includes(q))
      : this.channels();
  });

  memberCountLabel = computed(() => {
    const ch = this.activeChannel();
    if (!ch) return '';
    const count = ch.memberIds?.length ?? ch.members?.length ?? 0;
    return `${count} member${count !== 1 ? 's' : ''}`;
  });

  private socket!: Socket;
  private shouldScrollBottom = false;
  private typingStopTimers   = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly API = environment.apiUrl;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.loadOrgUsers();
    this.loadChannels();
    this.initSocket();
    // Close context menu on global click
    document.addEventListener('click', this.docClickHandler);
  }

  ngOnDestroy() {
    this.socket?.disconnect();
    this.typingStopTimers.forEach(t => clearTimeout(t));
    document.removeEventListener('click', this.docClickHandler);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  private docClickHandler = () => { this.zone.run(() => { this.ctxMenu.set(null); this.showQuickEmoji = false; }); };

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  private initSocket() {
    const token = this.storage.getToken();
    this.socket = io(environment.wsUrl, {
      auth:                { token },
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionAttempts: 10,
      reconnectionDelay:   1000,
    });

    this.socket.on('connect', () => {
      this.zone.run(() => {
        this.connected.set(true);
        const ch = this.activeChannel();
        if (ch) this.socket.emit('channel:join', ch._id);
      });
    });

    this.socket.on('disconnect', () => this.zone.run(() => this.connected.set(false)));

    // ── New message ─────────────────────────────────────────────────────────
    this.socket.on('message:new', (payload: { message: Message; channelId: string }) => {
      this.zone.run(() => {
        const { message, channelId } = payload;
        const active = this.activeChannel();

        if (active && channelId === active._id) {
          this.messages.update(ms => {
            const withoutTemp = ms.filter(m => !(m.tempId && m.senderId === this.myId));
            const exists = withoutTemp.some(m => m._id === message._id);
            return exists ? withoutTemp : [...withoutTemp, message];
          });
          this.shouldScrollBottom = true;
          this.markSeen(channelId);
        } else {
          // Bump unread badge for other channels
          this.channels.update(cs => cs.map(c => c._id === channelId ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 } : c));
        }
      });
    });

    // ── Message edited ──────────────────────────────────────────────────────
    this.socket.on('message:edited', (data: { messageId: string; content: string; editedAt: string }) => {
      this.zone.run(() => {
        this.messages.update(ms => ms.map(m =>
          m._id === data.messageId ? { ...m, content: data.content, isEdited: true, editedAt: data.editedAt } : m
        ));
      });
    });

    // ── Message deleted ─────────────────────────────────────────────────────
    this.socket.on('message:deleted', (data: { messageId: string }) => {
      this.zone.run(() => {
        this.messages.update(ms => ms.map(m =>
          m._id === data.messageId ? { ...m, deletedForAll: true, content: '', reactions: [] } : m
        ));
      });
    });

    // ── Seen ────────────────────────────────────────────────────────────────
    this.socket.on('message:seen', (data: { channelId: string; userId: string; at: string }) => {
      this.zone.run(() => {
        const active = this.activeChannel();
        if (!active || data.channelId !== active._id) return;
        if (data.userId === this.myId) return;
        // Mark all messages to this user as seen
        this.messages.update(ms => ms.map(m => {
          if (!isOwn(m, this.myId)) return m;
          const statuses = (m.statuses ?? []).map(s =>
            s.userId === data.userId ? { ...s, status: 'seen' as const, seenAt: data.at } : s
          );
          return { ...m, statuses };
        }));
      });
    });

    // ── Delivered ───────────────────────────────────────────────────────────
    this.socket.on('message:delivered', (data: { channelId: string; userId: string; at: string }) => {
      this.zone.run(() => {
        const active = this.activeChannel();
        if (!active || data.channelId !== active._id) return;
        this.messages.update(ms => ms.map(m => {
          if (!isOwn(m, this.myId)) return m;
          const statuses = (m.statuses ?? []).map(s =>
            s.userId === data.userId && s.status === 'sent' ? { ...s, status: 'delivered' as const } : s
          );
          return { ...m, statuses };
        }));
      });
    });

    // ── Reaction ────────────────────────────────────────────────────────────
    this.socket.on('message:reaction', (data: { messageId: string; emoji: string; userId: string; added: boolean }) => {
      this.zone.run(() => {
        this.messages.update(ms => ms.map(m => {
          if (m._id !== data.messageId) return m;
          let reactions = [...(m.reactions ?? [])];
          const existing = reactions.find(r => r.emoji === data.emoji);
          if (data.added) {
            if (existing) {
              if (!existing.userIds.includes(data.userId)) existing.userIds = [...existing.userIds, data.userId];
            } else {
              reactions = [...reactions, { emoji: data.emoji, userIds: [data.userId] }];
            }
          } else {
            if (existing) {
              existing.userIds = existing.userIds.filter(id => id !== data.userId);
              if (existing.userIds.length === 0) reactions = reactions.filter(r => r.emoji !== data.emoji);
            }
          }
          return { ...m, reactions };
        }));
      });
    });

    // ── Typing ──────────────────────────────────────────────────────────────
    this.socket.on('typing:start', (data: { userId: string; name: string; channelId: string }) => {
      this.zone.run(() => {
        if (data.userId === this.myId) return;
        const ch = this.activeChannel();
        if (!ch || data.channelId !== ch._id) return;
        const set = this.typingMap.get(ch._id) ?? new Set<string>();
        set.add(data.name);
        this.typingMap.set(ch._id, set);
        this.typingNames.set([...set]);
      });
    });

    this.socket.on('typing:stop', (data: { userId: string; channelId: string; name?: string }) => {
      this.zone.run(() => {
        const ch = this.activeChannel();
        if (!ch || data.channelId !== ch._id) return;
        const set = this.typingMap.get(ch._id);
        if (set && data.name) { set.delete(data.name); this.typingNames.set([...set]); }
        else if (set) { set.clear(); this.typingNames.set([]); }
      });
    });
  }

  private get myId(): string { const u = this.auth.currentUser() as any; return u?._id ?? u?.id ?? ''; }

  // ── Data loading ──────────────────────────────────────────────────────────
  loadOrgUsers() {
    this.http.get<any>(`${this.API}/users?limit=200&isActive=true`).subscribe({
      next: r => this.orgUsers.set(r.data ?? []),
    });
  }

  loadChannels() {
    this.channelsLoading.set(true);
    this.http.get<any>(`${this.API}/chat/channels`, { params: { limit: '100' } }).subscribe({
      next: r => { this.channels.set(r.data ?? []); this.channelsLoading.set(false); },
      error: () => this.channelsLoading.set(false),
    });
  }

  selectChannel(ch: Channel) {
    const prev = this.activeChannel();
    if (prev?._id === ch._id) return;
    if (prev) this.socket?.emit('channel:leave', prev._id);

    this.activeChannel.set(ch);
    this.messages.set([]);
    this.typingMap.clear();
    this.typingNames.set([]);
    this.msgText = '';
    this.editingMsg.set(null);
    this.replyingTo.set(null);
    this.loadingMsgs.set(true);

    this.socket?.emit('channel:join', ch._id);

    this.http.get<any>(`${this.API}/chat/channels/${ch._id}/messages`, { params: { limit: '60' } }).subscribe({
      next: r => {
        const msgs: Message[] = [...(r.data ?? [])].reverse();
        this.messages.set(msgs);
        this.loadingMsgs.set(false);
        this.shouldScrollBottom = true;
        this.markSeen(ch._id);
        this.channels.update(cs => cs.map(c => c._id === ch._id ? { ...c, unreadCount: 0 } : c));
      },
      error: () => this.loadingMsgs.set(false),
    });
  }

  // ── Messaging ─────────────────────────────────────────────────────────────
  sendOrSave() {
    if (this.editingMsg()) { this.saveEdit(); }
    else { this.sendMessage(); }
  }

  sendMessage() {
    const content = this.msgText.trim();
    const ch = this.activeChannel();
    if (!content || !ch || !this.connected()) return;
    this.msgText = '';
    this.showQuickEmoji = false;
    this.stopTyping(ch._id);

    const tempId  = `temp_${Date.now()}`;
    const replyTo = this.replyingTo();
    this.replyingTo.set(null);

    const tempMsg: Message = {
      _id: tempId, tempId, content,
      senderId: this.myId,
      createdAt: new Date().toISOString(),
      ...(replyTo ? { replyToSnapshot: { senderName: this.senderName(replyTo), content: replyTo.content } } : {}),
    };
    this.messages.update(ms => [...ms, tempMsg]);
    this.shouldScrollBottom = true;

    const body: any = { content };
    if (replyTo) body.replyToId = replyTo._id;

    this.http.post<any>(`${this.API}/chat/channels/${ch._id}/messages`, body).subscribe({
      next: r => {
        const real: Message = r.data?.message ?? r.data;
        this.messages.update(ms => ms.map(m => m._id === tempId ? real : m));
      },
      error: err => {
        this.messages.update(ms => ms.filter(m => m._id !== tempId));
        this.toast.error(err?.error?.message ?? 'Failed to send');
      },
    });
  }

  startEdit(msg: Message) {
    this.editingMsg.set(msg);
    this.msgText = msg.content;
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 50);
  }

  saveEdit() {
    const msg = this.editingMsg();
    if (!msg || !this.msgText.trim()) return;
    const newContent = this.msgText.trim();
    this.msgText = '';
    this.editingMsg.set(null);

    // Optimistic
    this.messages.update(ms => ms.map(m => m._id === msg._id ? { ...m, content: newContent, isEdited: true } : m));

    this.http.patch<any>(`${this.API}/chat/messages/${msg._id}`, { content: newContent }).subscribe({
      error: err => {
        this.messages.update(ms => ms.map(m => m._id === msg._id ? msg : m)); // revert
        this.toast.error(err?.error?.message ?? 'Failed to edit');
      },
    });
  }

  cancelEdit() {
    this.editingMsg.set(null);
    this.msgText = '';
  }

  deleteMsg(msg: Message, forAll: boolean) {
    if (forAll) {
      // Optimistic
      this.messages.update(ms => ms.map(m => m._id === msg._id ? { ...m, deletedForAll: true, content: '', reactions: [] } : m));
      this.http.delete(`${this.API}/chat/messages/${msg._id}`).subscribe({
        error: err => {
          this.messages.update(ms => ms.map(m => m._id === msg._id ? msg : m)); // revert
          this.toast.error(err?.error?.message ?? 'Failed to delete');
        },
      });
    } else {
      // Delete for me: remove locally + call API
      this.messages.update(ms => ms.filter(m => m._id !== msg._id));
      this.http.delete(`${this.API}/chat/messages/${msg._id}/me`).subscribe({ error: () => {} });
    }
  }

  toggleReaction(msg: Message, emoji: string) {
    // Optimistic toggle
    const myId = this.myId;
    this.messages.update(ms => ms.map(m => {
      if (m._id !== msg._id) return m;
      let reactions = [...(m.reactions ?? [])];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.userIds.includes(myId)) {
          existing.userIds = existing.userIds.filter(id => id !== myId);
          if (existing.userIds.length === 0) reactions = reactions.filter(r => r.emoji !== emoji);
        } else {
          existing.userIds = [...existing.userIds, myId];
        }
      } else {
        reactions = [...reactions, { emoji, userIds: [myId] }];
      }
      return { ...m, reactions };
    }));

    this.http.post(`${this.API}/chat/messages/${msg._id}/reactions`, { emoji }).subscribe({ error: () => {} });
  }

  replyTo(msg: Message) {
    this.replyingTo.set(msg);
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 50);
  }

  copyMsg(msg: Message) {
    navigator.clipboard.writeText(msg.content).then(() => this.toast.success('Copied!'));
  }

  // ── Context menu ──────────────────────────────────────────────────────────
  openContextMenu(msg: Message, event: MouseEvent) {
    event.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 180;
    const menuH = 280;
    let x = event.clientX;
    let y = event.clientY;
    if (x + menuW > vw) x = vw - menuW - 8;
    if (y + menuH > vh) y = vh - menuH - 8;
    this.ctxMenu.set({ msg, x, y });
  }

  closeContextMenu() { this.ctxMenu.set(null); }

  // ── Seen/Delivered marking ────────────────────────────────────────────────
  private markSeen(channelId: string) {
    this.http.post(`${this.API}/chat/channels/${channelId}/seen`, {}).subscribe({ error: () => {} });
  }

  // ── Typing ────────────────────────────────────────────────────────────────
  onTypingInput() {
    const ch = this.activeChannel();
    if (!ch) return;
    this.socket?.emit('typing:start', { channelId: ch._id });
    const key = ch._id;
    const prev = this.typingStopTimers.get(key);
    if (prev) clearTimeout(prev);
    this.typingStopTimers.set(key, setTimeout(() => this.stopTyping(key), 4000));
    this.showQuickEmoji = false;
  }

  private stopTyping(channelId: string) {
    this.socket?.emit('typing:stop', { channelId });
    const t = this.typingStopTimers.get(channelId);
    if (t) { clearTimeout(t); this.typingStopTimers.delete(channelId); }
  }

  onKey(e: Event) {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) { e.preventDefault(); this.sendOrSave(); }
    if (ke.key === 'Escape') { this.cancelEdit(); this.replyingTo.set(null); }
  }

  appendEmoji(e: string) { this.msgText += e; this.showQuickEmoji = false; this.inputEl?.nativeElement?.focus(); }

  // ── Create channel ────────────────────────────────────────────────────────
  toggleMember(id: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (this.newCh.type === 'dm') {
      this.newCh.memberIds = checked ? [id] : [];
    } else {
      this.newCh.memberIds = checked
        ? [...this.newCh.memberIds, id]
        : this.newCh.memberIds.filter(x => x !== id);
    }
  }

  createChannel() {
    if (!this.newCh.memberIds.length) return;
    if (this.newCh.type === 'group' && !this.newCh.name.trim()) return;
    this.newChSaving.set(true);
    const body: any = { type: this.newCh.type, memberIds: this.newCh.memberIds };
    if (this.newCh.type === 'group') body.name = this.newCh.name.trim();

    this.http.post<any>(`${this.API}/chat/channels`, body).subscribe({
      next: r => {
        const ch: Channel = r.data?.channel ?? r.data;
        this.channels.update(cs => {
          const existing = cs.find(c => c._id === ch._id);
          return existing ? cs.map(c => c._id === ch._id ? ch : c) : [ch, ...cs];
        });
        this.newChSaving.set(false);
        this.showNewChannel.set(false);
        this.resetNewCh();
        this.selectChannel(ch);
        this.toast.success('Chat created!');
      },
      error: err => { this.newChSaving.set(false); this.toast.error(err?.error?.message ?? 'Failed to create chat'); },
    });
  }

  resetNewCh() { this.newCh = { type: 'dm', name: '', memberIds: [] }; }

  // ── Helpers ───────────────────────────────────────────────────────────────
  isOwn(msg: Message): boolean { return isOwn(msg, this.myId); }

  senderName(msg: Message): string { return (msg.senderId as Member)?.name ?? 'Unknown'; }
  /** Extracts sender string ID safely — works when senderId is populated or a raw string */
  senderId(msg: Message): string { return (msg.senderId as any)?._id ?? (msg.senderId as string) ?? ''; }

  displayName(ch: Channel): string {
    if (ch.name) return ch.name;
    if (ch.type === 'dm') {
      const me = this.myId;
      const other = ((ch.members ?? ch.memberIds ?? []) as any[]).find(m => (m?._id ?? m)?.toString() !== me);
      return other?.name ?? other?.email ?? 'Direct Message';
    }
    return `${ch.type} chat`;
  }

  avatarChar(ch: Channel): string {
    if (ch.type === 'group') return '#';
    if (ch.type === 'team') return '⚡';
    if (ch.type === 'project') return '📁';
    return this.displayName(ch).charAt(0).toUpperCase();
  }

  chAvatarGradient(ch: Channel): string {
    const map: Record<string, string> = {
      dm:      'bg-gradient-to-br from-indigo-500 to-blue-600',
      group:   'bg-gradient-to-br from-violet-500 to-purple-600',
      team:    'bg-gradient-to-br from-amber-500 to-orange-600',
      project: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    };
    return map[ch.type] ?? map['dm'];
  }

  chTypeIcon(ch: Channel): string {
    return { dm: 'bx-user', group: 'bx-group', team: 'bxs-bolt-circle', project: 'bx-folder-open' }[ch.type] ?? 'bx-chat';
  }

  chTypeLabel(ch: Channel): string {
    return { dm: 'Direct message', group: 'Group', team: 'Team', project: 'Project' }[ch.type] ?? ch.type;
  }

  bubbleClass(msg: Message): string {
    if (msg.deletedForAll || msg.isDeletedForAll) {
      return 'bg-slate-700/30 text-slate-500 border border-slate-600/30';
    }
    return this.isOwn(msg)
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-indigo-500/20'
      : 'bg-slate-700/70 text-slate-100 rounded-bl-sm';
  }

  // Seen / delivered ticks
  isSeen(msg: Message): boolean {
    return (msg.statuses ?? []).some(s => s.status === 'seen');
  }

  isDelivered(msg: Message): boolean {
    return (msg.statuses ?? []).some(s => s.status === 'delivered');
  }

  tickColor(msg: Message): string {
    if (this.isSeen(msg)) return 'text-indigo-400';
    if (this.isDelivered(msg)) return 'text-slate-400';
    return 'text-slate-600';
  }

  tickTitle(msg: Message): string {
    if (this.isSeen(msg)) return 'Seen';
    if (this.isDelivered(msg)) return 'Delivered';
    return 'Sent';
  }

  hasMyReaction(msg: Message, emoji: string): boolean {
    return (msg.reactions ?? []).find(r => r.emoji === emoji)?.userIds.includes(this.myId) ?? false;
  }

  // Date separator
  showDateSeparator(msg: Message, prev: Message | undefined): boolean {
    if (!prev) return false;
    const a = new Date(prev.createdAt).toDateString();
    const b = new Date(msg.createdAt).toDateString();
    return a !== b;
  }

  dateSep(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Avatar color based on user ID hash
  senderColor(id: string): string {
    const colors = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#14b8a6,#0d9488)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#3b82f6,#2563eb)',
    ];
    let hash = 0;
    for (let i = 0; i < (id ?? '').length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  }

  private scrollToBottom() {
    try { this.bottomAnchor?.nativeElement?.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch {}
  }
}

// ── Pure helper ───────────────────────────────────────────────────────────────
function isOwn(msg: Message, myId: string): boolean {
  if (!myId) return false;
  const sid = (msg.senderId as any)?._id ?? (msg.senderId as any)?.id ?? msg.senderId;
  return sid?.toString() === myId;
}
