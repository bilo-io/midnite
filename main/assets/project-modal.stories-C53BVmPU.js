import{n as s,T as R}from"./iframe-BlMonxM8.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-BAEYofuU.js";import{P as H}from"./project-modal-wXiRUERw.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Bi2UEYrH.js";import"./index-a9ZvxDeA.js";import"./check-mNrV4FD-.js";import"./triangle-alert-CBjfH6DE.js";import"./export-menu-BrRb6qwR.js";import"./client-ECf5FXjt.js";import"./markdown-preview-Ba5Tm7kj.js";import"./file-text-DzVKEyXj.js";import"./copy-DYam_sG5.js";import"./loader-circle-DSnQLmfL.js";import"./api-BCjkhNtG.js";import"./inbound-C72cBbSB.js";import"./folder-open-lTMD1gG3.js";import"./folder-C9tqOPkm.js";import"./project-tag-BBqu2Shw.js";import"./tag-color-picker-BfntInl_.js";import"./source-list-editor-cbA2zyug.js";import"./source-icon-BC-ej3uc.js";import"./globe-BNkRT7Gj.js";import"./sticky-note-CJ-3kMOa.js";import"./plus-DoTM-8mL.js";import"./external-link-tOQDeMoc.js";import"./task-row-CP-syWIa.js";import"./blocked-badge-D_zy0F1m.js";import"./selectable-icon-C4I8nSeF.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DRdP3Q_h.js";import"./pencil-CGU5U0XO.js";import"./trash-2-Ce9sYDko.js";import"./refresh-cw-B0GFQVvY.js";import"./index-DJcqkVou.js";import"./lightbulb-DHysT4O5.js";import"./templates-B6M1OYb3.js";import"./sparkles-lLkfV5Rv.js";import"./brain-77GxoPYA.js";import"./chevron-right-C14gP1Bu.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
