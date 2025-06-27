import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DictionaryRoutingModule } from './dictionary-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { RouterModule } from '@angular/router';
import { DictionaryService } from '../../core/services/dictionary.service';
import { RevisionHistoryComponent } from '../../shared/components/revision-history/revision-history.component';
import { WordStatusBadgeComponent } from '../../shared/components/word-status-badge/word-status-badge.component';

import { SearchComponent } from './components/search/search.component';
import { WordDetailsComponent } from './components/word-details/word-details.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { AddWordComponent } from './components/add-word/add-word.component';
import { EditWordComponent } from './components/edit-word/edit-word.component';

@NgModule({
  declarations: [
    SearchComponent,
    WordDetailsComponent,
    SearchResultsComponent,
    AddWordComponent,
    EditWordComponent,
    RevisionHistoryComponent,
    WordStatusBadgeComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DictionaryRoutingModule,
    SharedModule,
    RouterModule,
  ],
  providers: [DictionaryService],
  exports: [SearchComponent, WordDetailsComponent, SearchResultsComponent],
})
export class DictionaryModule {}
